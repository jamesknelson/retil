import { AbortController } from 'abort-controller'

import { Outlet } from '../../../outlets'

import { ResourceQueryType } from '../types'

import { createLoader } from './loader'
import {
  Schematic,
  SchematicChunk,
  SchematicRecordPointer,
  SchematicPickFunction,
} from './schematic'

export const defaultResourceOptions = {
  maxRetries: 10,
}

export interface ResourceResult<Data, Rejection, Vars> {
  /**
   * Returns true if there's no value, and we're no longer looking for one.
   */
  abandoned: boolean

  data?: Data

  getData(): Data
  getRejection(): Rejection

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
   * When true, indicates that we're expecting to receive new data due to an
   * in-progress operation.
   */
  pending: boolean

  /**
   * Indicates that we're still waiting on an initial value.
   */
  primed: boolean

  rejection?: Rejection

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
  Input = any,
  Bucket extends string = any,
  Chunk extends SchematicChunk<any> = any
> extends ResourceOptions<Vars, Context, Input> {
  schematic: Schematic<
    Result,
    Vars,
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
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  Chunk extends SchematicChunk<any> = any
>(
  options: StandaloneResourceOptions<
    Result,
    Vars,
    Context,
    Input,
    Bucket,
    Chunk
  >,
): Resource<Result, Rejection, Vars, Context, Vars, Input, Bucket, Chunk> {
  const { load, delayInterval, exponent, maxRetries, schematic } = {
    ...defaultResourceOptions,
    ...options,
  }

  const request: ResourceQueryType['request'] = (
    vars: Vars,
    context: Context,
  ) => {
    const { build, rootPointer, split } = schematic(vars)
    const abortController = new AbortController()

    if (!rootPointer) {
      throw new Error('Resource Error: Could not compute id from vars.')
    }

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
      select: (
        stateSource: Outlet<SchematicPickFunction>,
      ): Outlet<ResourceResult<Result, Rejection, Vars>> => {
        const schematicSource = stateSource.map(pick =>
          build(rootPointer, pick),
        )

        // If `getData()` or `getRejection()` are called while there's no
        // subscription, then they need to request the data and throw
        // a promise to the result -- this function facilitates that.
        const waitForValue = schematicSource.filter(result => result.primed)
          .getValue

        return schematicSource.map(result => ({
          ...result,
          abandoned: result.primed && !result.hasData && !result.hasRejection,
          getData(): Result {
            if (!result.primed) {
              throw waitForValue()
            }
            if (!result.hasData) {
              throw new Error(
                `Resource Error: no data is available. To prevent this error, ensure ` +
                  `that the "hasData" property is true before accessing "data".`,
              )
            }
            return result.data
          },
          getRejection(): Rejection {
            if (!result.primed) {
              throw waitForValue()
            }
            if (!result.hasRejection) {
              throw new Error(
                `Resource Error: no rejection is available. To prevent this error, ` +
                  `ensure that the "hasRejection" property is true before accessing ` +
                  `"rejection".`,
              )
            }
            return result.rejection
          },
          id: rootPointer.__key__[1],
          type: rootPointer.__key__[0],
          vars,
        }))
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

  const resourceSchematic = (vars: any) => schematic(vars)
  const resource: Resource = Object.assign(resourceSchematic, {
    request,
  })
  return resource
}
