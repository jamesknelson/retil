import { exponentialBackoff } from '../../../utils/exponentialBackoff'

import {
  ResourceQueryType,
  ResourceQuery,
  ResourceRef,
  ResourceRefState,
  ResourceRejectionUpdater,
  ResourceSchema,
} from '../types'

export type ResourceContext = {
  fetchOptions?: object
}

export type ResourceLoader<
  Variables,
  Context extends ResourceContext,
  Response
> = (
  request: ResourceRequest<Variables, Context>,
) => Promise<Response | undefined>

export interface ResourceRequest<Variables, Context extends ResourceContext> {
  context: Context
  type: string
  signal: AbortSignal
  variables: Variables
}

export class Rejection<
  Schema extends ResourceSchema = any,
  Type extends keyof Schema = keyof Schema
> {
  constructor(readonly rejection: ResourceRejectionUpdater<Schema, Type>) {}
}
export class Retry {
  constructor(readonly when?: Promise<any>) {}
}

export interface ResourceOptions<
  Context extends ResourceContext = any,
  Schema extends ResourceSchema = any,
  Type extends keyof Schema = keyof Schema,
  Variables = string,
  Response = any
> {
  // The name of the query; this will be used to produce a special type which
  // contains references to the underlying data.
  name: string
  load: ResourceLoader<Variables, Context, Response>
  maxRetries?: number
  // If not supplied, the query type itself will be used, and the id will be
  // a stringified copy of the variables.
  getRef?: (
    response: Response,
    request: ResourceRequest<Variables, Context>,
  ) => Promise<ResourceRef<Schema, Type>>
  // either a single `getData` which handles all possible types, or a map of
  // type functions
  transform?: <T extends Type>(
    response: Response,
    request: ResourceRequest<Variables, Context>,
    ref: ResourceRef<Schema, T>,
  ) => Promise<Schema[T][0]>
}

export interface ResourceSnapshot<
  Data,
  Rejection = string,
  Variables = string
> {
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

  variables: Variables
}

export const defaultResourceOptions = {
  getData: (response: any) => response,
  getRejection: (response: any) =>
    response === null ? ('notFound' as any) : null,
  isValidResponse: (response: any) => response !== undefined,
  maxRetries: 10,
  type: 'default',
}

export function createResource<
  Data,
  Rejection = string,
  Variables = string,
  Context extends ResourceContext = any
>(
  options:
    | ResourceLoader<Variables, Context, Data>
    | ResourceOptions<Data, Rejection, Variables, Context, Data>,
): ResourceQueryType<ResourceSnapshot<Data, Rejection, Variables>, Variables>
export function createResource<
  Data,
  Rejection = string,
  Variables = string,
  Context extends ResourceContext = any,
  Response = Data | null
>(
  loader: ResourceLoader<Variables, Context, Data>,
): ResourceQueryType<
  ResourceSnapshot<
    unknown extends Data ? Response : Data,
    Rejection,
    Variables
  >,
  Variables
>
export function createResource<
  Data,
  Rejection = string,
  Variables = string,
  Context extends ResourceContext = any,
  Response = Data | null
>(
  optionsOrLoader:
    | ResourceLoader<Variables, Context, Response>
    | ResourceOptions<Data, Rejection, Variables, Context, Response>,
): ResourceQueryType<
  ResourceSnapshot<
    unknown extends Data ? Response : Data,
    Rejection,
    Variables
  >,
  Variables
> {
  if (typeof optionsOrLoader === 'function') {
    optionsOrLoader = {
      load: optionsOrLoader as ResourceLoader<Variables, Context, Response>,
    }
  }
  const { load, getData, getRejection, isValidResponse, maxRetries, type } = {
    ...defaultResourceOptions,
    ...optionsOrLoader,
  }

  const resource = (
    variables: Variables,
    context: Context,
  ): ResourceQuery<ResourceSnapshot<
    unknown extends Data ? Response : Data,
    Rejection,
    Variables
  >> => {
    const id = JSON.stringify(variables)

    return {
      refs: [[type, id]],

      select: subs => {
        return subs.map(
          ([{ pending, primed, state }]) =>
            new ResourceSnapshotImplementation(
              primed,
              pending,
              state,
              variables,
              subs.filter(([{ primed }]) => primed).getValue,
            ),
        )
      },

      load: ({ abandon, error, setData, setRejection, signal }) => {
        const execute = exponentialBackoff({ maxRetries })
        const request = { context, type, signal, variables }

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
    }
  }

  return resource
}

class ResourceSnapshotImplementation<Data, Rejection, Variables>
  implements ResourceSnapshot<Data, Rejection, Variables> {
  constructor(
    readonly primed: boolean,
    readonly pending: boolean,
    readonly state: ResourceRefState<Data, Rejection>,
    readonly variables: Variables,
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
