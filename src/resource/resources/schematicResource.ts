import AbortController from 'abort-controller'

import { Outlet } from '../../outlets'
import {
  AsyncTaskScheduler,
  exponentialBackoffScheduler,
} from '../../utils/asyncTaskSchedulers'

import {
  Chunk,
  Picker,
  Resource,
  ResourceRequest,
  ResourceRequestActions,
  RootSchematic,
  RootSelection,
  Schematic,
  PickerResult,
} from '../types'

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

export interface SchematicResourceContext {
  fetch?: typeof fetch
  fetchOptions?: RequestInit
}

export type SchematicResourceLoad<Vars = any, Context = any, Input = any> =
  | RequestInfo
  | ((
      vars: Vars,
      context: Context,
      signal: AbortSignal,
    ) => Promise<Input> | RequestInfo)

// the idea is if you have a graphql query/schema/endpoint url, then you can
// map it to a resource -- type, embed, etc. will be generated automatically.
// you'll need to supply your own TypeScript types, though.
export interface SchematicResourceBaseOptions<
  Vars = string,
  Context extends SchematicResourceContext = any,
  Input = any
> {
  load?: SchematicResourceLoad<Vars, Context, Input>
  loadScheduler?: AsyncTaskScheduler
}

export interface SchematicResourceOptions<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Context extends SchematicResourceContext = any,
  Input = any,
  Bucket extends string = any,
  C extends Chunk<any> = any
> extends SchematicResourceBaseOptions<Vars, Context, Input> {
  schematic: RootSchematic<
    ResultData,
    ResultRejection,
    Vars,
    Input,
    RootSelection<Bucket>,
    C
  >
}

export interface SchematicResource<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Context extends SchematicResourceContext = any,
  Input = any,
  Bucket extends string = any,
  C extends Chunk<any> = any
>
  extends Schematic<
      ResultData,
      ResultRejection,
      Vars,
      Input,
      RootSelection<Bucket>,
      C
    >,
    Resource<ResultData, ResultRejection, Vars, Context> {}

export function extractSchematicResourceOptions<
  Options extends SchematicResourceBaseOptions
>(
  options: Options,
): [
  SchematicResourceBaseOptions,
  Omit<Options, keyof SchematicResourceBaseOptions>,
] {
  const { load, loadScheduler, ...rest } = {
    ...defaultResourceOptions,
    ...options,
  }
  return [{ load, loadScheduler }, rest]
}

export function createSchematicResource<
  ResultData = unknown,
  ResultRejection = unknown,
  Vars = any,
  Context extends SchematicResourceContext = any,
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
  const { load: loadOption, loadScheduler, schematic } = {
    ...defaultResourceOptions,
    ...options,
  }

  const load = loadOption && wrapLoad(loadOption)

  const request = (
    vars: Vars,
    context: Context,
  ): ResourceRequest<ResultData, ResultRejection> => {
    const schematicInstance = schematic(vars)
    const selection = schematicInstance.selection
    const abortController = new AbortController()

    if (!selection) {
      throw new Error(
        'Resource Error: Could not compute selection from resource vars.',
      )
    }

    return {
      root: selection.root,

      select: (
        pickerSource: Outlet<Picker>,
      ): Outlet<PickerResult<ResultData, ResultRejection>> => {
        return pickerSource.map(pick =>
          schematicInstance.build(selection, pick),
        )
      },

      load: (actions: ResourceRequestActions) => {
        if (!load) {
          return actions.abandon()
        }

        const handle = loadScheduler(async (complete, retry) => {
          try {
            const input = await load(vars, context, abortController.signal)
            actions.update(schematicInstance.chunk(input).chunks)
            complete()
          } catch (something) {
            if (something instanceof Rejection) {
              const rejection = something.rejection
              actions.update([
                {
                  ...selection.root,
                  payload: { type: 'rejection', rejection },
                },
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

  const resourceSchematic = (vars: Vars = undefined as any) => schematic(vars)
  return Object.assign(resourceSchematic, { request })
}

function wrapLoad<Vars, Context extends SchematicResourceContext, Input>(
  load: SchematicResourceLoad<Vars, Context, Input>,
) {
  const loadFn = typeof load === 'function' ? load : () => load

  return async (
    vars: Vars,
    context: Context,
    signal: AbortSignal,
  ): Promise<Input> => {
    const promiseOrRequest = loadFn(vars, context, signal)
    if (isPromise(promiseOrRequest)) {
      return promiseOrRequest
    }

    const url =
      typeof promiseOrRequest === 'string'
        ? promiseOrRequest
        : promiseOrRequest.url
    const fetchOptions = {
      ...context.fetchOptions,
      ...(typeof promiseOrRequest === 'string' ? undefined : promiseOrRequest),
    }
    const fetch = context.fetch || window.fetch

    try {
      const response = await fetch(url, fetchOptions)
      if (response.ok) {
        return await response.json()
      } else if (response.status >= 400 && response.status < 500) {
        throw new Rejection(response.statusText)
      } else {
        throw new Retry()
      }
    } catch (error) {
      console.error('Error fetching resource data:', error)
      throw new Retry()
    }
  }
}

function isPromise(x: any): x is Promise<any> {
  return x && x.then
}
