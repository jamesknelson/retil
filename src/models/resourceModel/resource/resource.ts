import { AbortController } from 'abort-controller'

import { Outlet } from '../../../outlets'

import {
  NormalizedChunk,
  RequestableSchematic,
  Schematic,
  record,
} from '../schematic'
import {
  ResourceCache,
  ResourceQueryType,
  ResourceRecordPointer,
  ResourceRefState,
} from '../types'

import { createLoader } from './loader'

export const defaultResourceOptions = {
  maxRetries: 10,
}

export interface ResourceResult<Data, Rejection, Vars> {
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

  vars: Vars
}

export interface ResourceRequest<Vars, Context> {
  context: Context
  signal: AbortSignal
  vars: Vars
}

// the idea is if you have a graphql query/schema/endpoint url, then you can
// map it to a resource -- type, embed, etc. will be generated automatically.
// you'll need to supply your own TypeScript types, though.
export interface ResourceOptions<
  Vars = string,
  Context = any,
  Input = any,
  S extends RequestableSchematic = any
> {
  load: (request: ResourceRequest<Vars, Context>) => Promise<Input>

  composing?: S

  delayInterval?: number
  exponent?: number
  maxRetries?: number
}

export interface Resource<
  Result = any,
  Rejection = any,
  Vars extends Props = any,
  Context extends object = any,
  Props = any,
  Input = any,
  Root extends ResourceRecordPointer = any,
  Chunk extends NormalizedChunk<any> = any
>
  extends Schematic<Result, Props, Input, Root, Chunk>,
    ResourceQueryType<ResourceResult<Result, Rejection, Vars>, Vars, Context> {}

export function createResource<
  Result = unknown,
  Rejection = string,
  Vars extends Props = any,
  Context extends object = any,
  Props = any,
  Input = any,
  Root extends ResourceRecordPointer = any,
  Chunk extends NormalizedChunk<any> = any,
  S extends RequestableSchematic<Result, Vars, Props, Input, Root, Chunk> = any
>(
  options: ResourceOptions<Vars, Context, Input, S>,
): Resource<Result, Rejection, Vars, Context, Props, Input, Root, Chunk> {
  const { load, delayInterval, exponent, maxRetries } = {
    ...defaultResourceOptions,
    ...options,
  }

  const composing: S = options.composing || (record() as S)

  const request: ResourceQueryType['request'] = (
    vars: Vars,
    context: Context,
  ) => {
    const { build, split } = composing(vars)
    const root = composing.request(vars, context).root
    const abortController = new AbortController()
    const request: ResourceRequest<Vars, Context> = {
      context,
      signal: abortController.signal,
      vars,
    }

    const loader = createLoader({
      load: async () => {
        const input = await load(request)
        const { chunks } = split(input)
        return chunks
      },
      root,

      delayInterval,
      exponent,
      maxRetries,
    })

    return {
      root,

      select: (
        source: Outlet<{
          pending: boolean
          primed: boolean
          state: ResourceRefState
        }>,
        cache: ResourceCache<any, any>,
      ): Outlet<ResourceResult<Result, Rejection, Vars>> => {
        return source.map(
          ({ pending, primed, state }) =>
            new ResourceResultImplementation(
              primed,
              pending,
              state,
              vars,
              source.filter(({ primed }) => primed).getValue,
            ),
        )
      },

      load: request => {
        const cancel = loader(request)
        return () => {
          cancel()
          abortController.abort()
        }
      },
    }
  }

  const schematic: Resource = Object.assign(
    (props: unknown extends Props ? any : Props) => composing(props),
    { request },
  )

  return schematic
}

class ResourceResultImplementation<Data, Rejection, Variables>
  implements ResourceResult<Data, Rejection, Variables> {
  constructor(
    readonly primed: boolean,
    readonly pending: boolean,
    readonly state: ResourceRefState<Data, Rejection>,
    readonly vars: Variables,
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
