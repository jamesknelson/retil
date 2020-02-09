import { AbortController } from 'abort-controller'

import { Outlet } from '../outlets'
import {
  AsyncTaskScheduler,
  exponentialBackoffScheduler,
} from '../utils/asyncTaskSchedulers'

import { Resource, ResourceRequest, ResourceRequestActions } from './resource'
import { Schematic } from './schematic/schematic'
import {
  selectSuspendableResult,
  SuspendableResourceResult,
} from './suspendableResourceResult'
import { Chunk } from './structures/chunk'
import { PointerPicker, RecordPointer } from './structures/pointer'

// Can be thrown to indicate that the request was valid, but the server has
// decided not to fulfill it. Typical rejection reasons include Not Found,
// Forbidden, and other 400-series errors.
export class Rejection<Rejection = any> {
  constructor(readonly rejection: Rejection) {}
}

// Can be thrown to signal that the loader should retry again at a time of its
// choosing, optionally with a promise that indicates the earliest possible
// time.
export class Retry {
  constructor(readonly noEarlierThan?: Promise<any>) {}
}

export const defaultResourceOptions = {
  loadScheduler: exponentialBackoffScheduler({
    maxRetries: 10,
  }),
}

// the idea is if you have a graphql query/schema/endpoint url, then you can
// map it to a resource -- type, embed, etc. will be generated automatically.
// you'll need to supply your own TypeScript types, though.
export interface SchematicResourceBaseOptions<
  Vars = string,
  Context = any,
  Input = any
> {
  load?: (vars: Vars, context: Context, signal: AbortSignal) => Promise<Input>
  loadScheduler?: AsyncTaskScheduler
}

export interface SchematicResourceOptions<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Context = any,
  Input = any,
  Bucket extends string = any,
  C extends Chunk<any> = any
> extends SchematicResourceBaseOptions<Vars, Context, Input> {
  schematic: Schematic<
    ResultData,
    ResultRejection,
    Vars,
    Input,
    RecordPointer<Bucket>,
    C
  >
}

export interface SchematicResource<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  C extends Chunk<any> = any
>
  extends Schematic<
      ResultData,
      ResultRejection,
      Vars,
      Input,
      RecordPointer<Bucket>,
      C
    >,
    Resource<
      SuspendableResourceResult<ResultData, ResultRejection, Vars>,
      Vars,
      Context
    > {}

export function extractSchematicResourceOptions<
  Options extends SchematicResourceBaseOptions
>(
  options: Options,
): [
  SchematicResourceBaseOptions,
  Omit<Options, keyof SchematicResourceBaseOptions>,
] {
  const { load, loadScheduler, ...rest } = options
  return [{ load, loadScheduler }, rest]
}

export function schematicResource<
  ResultData = unknown,
  ResultRejection = unknown,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  C extends Chunk<any> = any
>(
  options: SchematicResourceOptions<
    ResultData,
    ResultRejection,
    Vars,
    Context,
    Input,
    Bucket,
    C
  >,
): SchematicResource<
  ResultData,
  ResultRejection,
  Vars,
  Context,
  Input,
  Bucket,
  C
> {
  const { load, loadScheduler, schematic } = {
    ...defaultResourceOptions,
    ...options,
  }

  const request = (
    vars: Vars,
    context: Context,
  ): ResourceRequest<SuspendableResourceResult<
    ResultData,
    ResultRejection,
    Vars
  >> => {
    const { build, chunk, defaultPointer } = schematic(vars)
    const abortController = new AbortController()

    if (!defaultPointer) {
      throw new Error(
        'Resource Error: Could not compute root id from resource vars.',
      )
    }

    return {
      select: (
        pickerSource: Outlet<PointerPicker>,
      ): Outlet<
        SuspendableResourceResult<ResultData, ResultRejection, Vars>
      > => {
        const stateSource = pickerSource.map(pick =>
          build(defaultPointer, pick),
        )
        return selectSuspendableResult(stateSource, defaultPointer, vars)
      },

      load: (actions: ResourceRequestActions) => {
        if (!load) {
          return actions.abandon()
        }

        const handle = loadScheduler(async (complete, retry) => {
          try {
            const input = await load(vars, context, abortController.signal)
            actions.update(chunk(input).chunks)
            complete()
          } catch (something) {
            if (something instanceof Rejection) {
              const rejection = something.rejection
              actions.update([
                [defaultPointer[0], defaultPointer[1], { rejection }],
              ])
            } else if (something instanceof Retry) {
              retry(something.noEarlierThan)
            } else {
              throw something
            }
          }
        })

        handle.result
          .then(result => result.status === 'abandoned' && actions.abandon())
          .catch(actions.error)

        return () => {
          // Cancel before abort, as abort may cause a fetch to throw an error,
          // and cancelling first will ensure that error is ignored.
          handle.cancel()
          abortController.abort()
        }
      },
    }
  }

  const resourceSchematic = (vars: Vars) => schematic(vars)
  return Object.assign(resourceSchematic, { request })
}