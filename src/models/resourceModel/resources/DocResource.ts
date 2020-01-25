import { exponentialBackoff } from '../../../utils/exponentialBackoff'

import { Resource, ResourceQuery, ResourceRefState } from '../types'

export type DocContext = {
  fetchOptions?: object
}

export type DocLoader<Context extends DocContext, Response> = (
  request: DocRequest<Context>,
) => Promise<Response | undefined>

export interface DocRequest<Context extends DocContext> {
  context: Context
  id: string | number
  type: string
  signal: AbortSignal
}

export interface DocResourceOptions<
  Data,
  Rejection = string,
  Context extends DocContext = any,
  Response = Data | null
> {
  load: DocLoader<Context, Response>
  getData?: (response: Response, request: DocRequest<Context>) => Promise<Data>
  getRejection?: (
    response: Response,
    request: DocRequest<Context>,
  ) =>
    | undefined
    | null
    | false
    | Rejection
    | Promise<undefined | null | false | Rejection>
  isValidResponse?: (response: any, request: DocRequest<Context>) => boolean
  maxRetries?: number
  type?: string
}

export interface DocResult<Data, Rejection = string> {
  /**
   * Returns true if there's no value, and we're no longer looking for one.
   */
  abandoned: boolean

  data: () => Data

  /**
   * If there's data that can be accessed, this will be true.
   */
  hasData?: boolean

  /**
   * If true, indicates that instead of the expected data, this key has been
   * marked with a reason that the data wasn't erturned. This can be used to
   * indicate that resource was not found, was forbidden, etc.
   */
  hasRejection?: boolean

  id: string | number

  /**
   * When true, indicates that we're expecting to receive new data due to an
   * in-progress operation.
   */
  pending: boolean

  /**
   * Indicates that we're still waiting on an initial value.
   */
  primed: boolean

  /**
   * Indicates that the data has been marked as possibly out of date, and in
   * need of a reload.
   */
  invalidated?: boolean

  rejection: () => Rejection

  type: string
}

export const defaultDocResourceOptions = {
  getData: (response: any) => response,
  getRejection: (response: any) =>
    response === null ? ('notFound' as any) : null,
  isValidResponse: (response: any) => response !== undefined,
  maxRetries: 10,
  type: 'default',
}

export function createDocResource<
  Data,
  Rejection = string,
  Context extends DocContext = any,
  Response = Data | null
>(
  optionsWithoutDefaults: DocResourceOptions<
    Data,
    Rejection,
    Context,
    Response
  >,
): Resource<DocResult<unknown extends Data ? Response : Data, string>, string> {
  if (typeof optionsWithoutDefaults === 'function') {
    optionsWithoutDefaults = {
      load: optionsWithoutDefaults as DocLoader<Context, Response>,
    }
  }
  const { load, getData, getRejection, isValidResponse, maxRetries, type } = {
    ...defaultDocResourceOptions,
    ...optionsWithoutDefaults,
  }

  return (
    id: string,
    context: Context,
  ): ResourceQuery<
    DocResult<unknown extends Data ? Response : Data, string>
  > => ({
    refs: [[type, id]],

    load: ({ abandon, error, setData, setRejection, signal }) => {
      const execute = exponentialBackoff({ maxRetries })
      const request = { context, id, type, signal }

      return execute({
        abandon,
        attempt: async () => {
          const response = (await load(request)) as Response
          if (!isValidResponse(response, request)) {
            return false
          }
          const rejectionReason = await getRejection(response, request)
          if (rejectionReason) {
            setRejection([[type, id, rejectionReason]])
          } else {
            const data = await getData(response, request)
            setData([[type, id, data]])
          }
          return true
        },
        error,
      })
    },

    sub: getRefStatesSub => {
      const refStatesSub = getRefStatesSub([[type, id]])
      return refStatesSub.map(
        ([refState]) =>
          new DocResultImplementation(
            refState,
            refStatesSub.filter(([refState]) => isPrimed(refState)).getValue,
          ),
      )
    },
  })
}

class DocResultImplementation<Data, Rejection>
  implements DocResult<Data, Rejection> {
  constructor(
    readonly state: ResourceRefState<Data, Rejection>,
    private waitForValue: () => Promise<any>,
  ) {}

  get abandoned(): boolean {
    return this.primed && !this.state.value
  }

  data(): Data {
    if (!this.primed) {
      throw this.waitForValue()
    }
    if (!this.state.value || this.state.value.type !== 'data') {
      throw new Error(
        `Resource Error: no data is available. To prevent this error, ensure ` +
          `that the "hasData" property is true before accessing "data".`,
      )
    }
    return this.state.value.data
  }

  get hasData(): boolean {
    return !!this.state.value && this.state.value.type === 'data'
  }

  get hasRejection(): boolean {
    return !!this.state.value && this.state.value.type === 'rejection'
  }

  get invalidated(): boolean {
    return !!this.state.invalidated
  }

  get id(): string | number {
    return this.state.ref[1]
  }

  get pending(): boolean {
    return isPending(this.state)
  }

  get primed(): boolean {
    return isPrimed(this.state)
  }

  rejection(): any {
    if (!this.primed) {
      throw this.waitForValue()
    }
    if (!this.state.value || this.state.value.type !== 'rejection') {
      throw new Error(
        `Resource Error: no inaccessible reason is available. To prevent this ` +
          `error, ensure that the "hasRejection" property is true before accessing ` +
          `"rejection".`,
      )
    }
    return this.state.value.rejection
  }

  get type(): string {
    return this.state.ref[0]
  }
}

function isPending(state: ResourceRefState<any, any>) {
  const hasRequestPolicy =
    state.request &&
    !!(
      state.request.policies.loadOnce +
      state.request.policies.loadInvalidated +
      state.request.policies.subscribe
    )

  return !!(
    state.tasks.manualLoad ||
    state.tasks.load ||
    state.modifierPolicies.expectingExternalUpdate ||
    // If there's no data but we can add a default request policy, then we'll
    // treat the resource as pending too.
    (hasRequestPolicy &&
      state.value === null &&
      state.tasks.load === null &&
      state.tasks.subscribe === null)
  )
}

function isPrimed(state: ResourceRefState<any, any>) {
  return !(
    state.value === null &&
    (isPending(state) || state.modifierPolicies.pauseLoad)
  )
}
