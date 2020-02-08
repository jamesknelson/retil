import { AbortController } from 'abort-controller'

import { Outlet } from '../../../outlets'

import { CacheKey, ResourceQueryType, ResourceScopeState } from '../types'

import { createLoader } from './loader'
import {
  RequestableSchematic,
  Schematic,
  SchematicBuildResult,
  SchematicChunk,
  SchematicRecordPointer,
} from './schematic'

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
   * Indicates that some of the data has been marked as possibly out of date,
   * and in need of a reload.
   */
  invalidated?: boolean

  id: string | number

  /**
   * Contains all keys used to build this result.
   */
  keys: CacheKey[]

  /**
   * When true, indicates that we're expecting to receive new data due to an
   * in-progress operation.
   */
  pending: boolean

  /**
   * Indicates that we're still waiting on an initial value.
   */
  primed: boolean

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

export interface StandaloneResourceOptions<
  Result = any,
  Vars = string,
  Context = any,
  Props = any,
  Input = any,
  Bucket extends string = any,
  Chunk extends SchematicChunk<any> = any
> extends ResourceOptions<Vars, Context, Input> {
  schematic: RequestableSchematic<
    Result,
    Vars,
    Props,
    Input,
    SchematicRecordPointer<Bucket>,
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
  Chunk extends SchematicChunk<any> = any
>
  extends Schematic<
      Result,
      Props,
      Input,
      SchematicRecordPointer<Bucket>,
      Chunk
    >,
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
  Chunk extends SchematicChunk<any> = any
>(
  options: StandaloneResourceOptions<
    Result,
    Vars,
    Context,
    Props,
    Input,
    Bucket,
    Chunk
  >,
): Resource<Result, Rejection, Vars, Context, Props, Input, Bucket, Chunk> {
  const { load, delayInterval, exponent, maxRetries, schematic } = {
    ...defaultResourceOptions,
    ...options,
  }

  const request: ResourceQueryType['request'] = (
    vars: Vars,
    context: Context,
  ) => {
    const { build, split } = schematic(vars)
    const rootPointer = schematic.request(vars, context).rootPointer
    const abortController = new AbortController()
    const loader =
      load &&
      createLoader({
        load: async () => {
          const input = await load(vars, context, abortController.signal)
          const { chunks } = split(input)
          return chunks
        },

        rootPointer,

        delayInterval,
        exponent,
        maxRetries,
      })

    return {
      rootPointer: rootPointer,

      select: (
        stateSource: Outlet<ResourceScopeState<any>>,
      ): Outlet<[ResourceResult<Result, Rejection, Vars>, CacheKey[]]> => {
        const schematicSource = stateSource.map(state =>
          build(state, rootPointer),
        )
        return schematicSource.map(result => [
          new ResourceResultImplementation(
            rootPointer.__key__,
            vars,
            result,

            // If `data()` or `rejection()` are called while there's no
            // subscription, then they need to request the data and throw
            // a promise to the result -- this function facilitates that.
            schematicSource.filter(result => result.primed).getValue,
          ),
          result.keys,
        ])
      },

      load: request => {
        if (!loader) {
          return request.abandon()
        }

        const cancel = loader(request)
        return () => {
          // Cancel before abort, as abort may cause a fetch to throw an error,
          // and cancelling first will ensure that error is ignored.
          cancel()
          abortController.abort()
        }
      },
    }
  }

  const resourceSchematic = (props: any) => schematic(props)
  const resource: Resource = Object.assign(resourceSchematic, {
    request,
  })
  return resource
}

class ResourceResultImplementation<Data, Rejection, Variables>
  implements ResourceResult<Data, Rejection, Variables> {
  constructor(
    readonly key: CacheKey,
    readonly vars: Variables,
    private result: SchematicBuildResult<Data>,
    private waitForValue: () => Promise<any>,
  ) {}

  get abandoned(): boolean {
    return (
      this.result.primed && !this.result.hasData && !this.result.hasRejection
    )
  }

  data(): Data {
    if (!this.result.primed) {
      throw this.waitForValue()
    }
    if (!this.result.hasData) {
      throw new Error(
        `Resource Error: no data is available. To prevent this error, ensure ` +
          `that the "hasData" property is true before accessing "data".`,
      )
    }
    return this.result.data
  }

  get hasData(): boolean {
    return this.result.type === 'data'
  }

  get hasRejection(): boolean {
    return this.result.type === 'rejection'
  }

  get invalidated(): boolean | undefined {
    return this.result.invalidated
  }

  get id(): string | number {
    return this.key[1]
  }

  get keys(): CacheKey[] {
    return this.result.keys
  }

  get pending(): boolean {
    return this.result.pending
  }

  get primed(): boolean {
    return this.result.type !== 'priming'
  }

  rejection(): any {
    if (this.result.type === 'priming') {
      throw this.waitForValue()
    }
    if (this.result.type !== 'rejection') {
      throw new Error(
        `Resource Error: no inaccessible reason is available. To prevent this ` +
          `error, ensure that the "hasRejection" property is true before accessing ` +
          `"rejection".`,
      )
    }
    return this.result.rejection
  }

  get type(): string {
    return this.key[0]
  }
}
