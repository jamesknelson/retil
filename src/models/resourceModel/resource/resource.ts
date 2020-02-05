import { AbortController } from 'abort-controller'

import { Outlet } from '../../../outlets'

import {
  ResourceCache,
  ResourceQueryType,
  ResourceRecordPointer,
  ResourceRefState,
} from '../types'

import { createLoader } from './loader'
import { NormalizedChunk, RequestableSchematic, Schematic } from './schematic'

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
export interface ResourceOptions<Vars = string, Context = any, Input = any> {
  load?: (vars: Vars, context: Context, signal: AbortSignal) => Promise<Input>

  delayInterval?: number
  exponent?: number
  maxRetries?: number
}

export interface ComposingResourceOptions<
  Result = any,
  Vars = string,
  Context = any,
  Props = any,
  Input = any,
  Bucket extends string = any,
  Chunk extends NormalizedChunk<any> = any
> extends ResourceOptions<Vars, Context, Input> {
  composing: RequestableSchematic<
    Result,
    Vars,
    Props,
    Input,
    ResourceRecordPointer<Bucket>,
    Chunk
  >
}

export interface Resource<
  Result = any,
  Rejection = any,
  Vars extends Props = any,
  Context extends object = any,
  Props = any,
  Input = any,
  Bucket extends string = any,
  Chunk extends NormalizedChunk<any> = any
>
  extends Schematic<Result, Props, Input, ResourceRecordPointer<Bucket>, Chunk>,
    ResourceQueryType<ResourceResult<Result, Rejection, Vars>, Vars, Context> {}

export function extractResourceOptions<Options extends ResourceOptions>(
  options: Options,
): [ResourceOptions, Omit<Options, keyof ResourceOptions>] {
  const { load, delayInterval, exponent, maxRetries, ...rest } = options
  return [{ load, delayInterval, exponent, maxRetries }, rest]
}

export function resource<
  Result = unknown,
  Rejection = string,
  Vars extends Props = any,
  Context extends object = any,
  Props = any,
  Input = any,
  Bucket extends string = any,
  Chunk extends NormalizedChunk<any> = any
>(
  options: ComposingResourceOptions<
    Result,
    Vars,
    Context,
    Props,
    Input,
    Bucket,
    Chunk
  >,
): Resource<Result, Rejection, Vars, Context, Props, Input, Bucket, Chunk> {
  const { load, delayInterval, exponent, maxRetries } = {
    ...defaultResourceOptions,
    ...options,
  }

  const composing = options.composing

  const request: ResourceQueryType['request'] = (
    vars: Vars,
    context: Context,
  ) => {
    const { build, split } = composing(vars)
    const root = composing.request(vars, context).root
    const abortController = new AbortController()

    // todo: handle load not being supplied

    const loader = createLoader({
      load: async () => {
        const input = await load!(vars, context, abortController.signal)
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
        return build(source, cache)

        // TODO:
        // - i'm not sure how to make it so that the child `build` only gets
        //   computed after `data` is called, while still making sure it
        //   holds any children. tricky.
        source.map(
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
          // Cancel before abort, as abort may cause a fetch to throw an error.
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
