/**
 * Load individual keys separaetly, using exponential backoff.
 */

import { exponentialBackoff } from 'utils/exponentialBackoff'

import { ResourceLoadStrategy } from '../types'

export type ResourceKeyLoadFunction<
  Response,
  Key = string,
  Context extends object = any
> = (
  request: ResourceKeyLoaderRequest<Key, Context>,
) => Promise<Response | undefined>

export interface ResourceKeyLoaderRequest<
  Key = string,
  Context extends object = any
> {
  key: Key
  path: string
  context: Context
  signal: AbortSignal
}

export interface ResourceKeyLoaderOptions<
  Data,
  Response = Data | null,
  Key = string,
  Context extends object = any
> {
  load: ResourceKeyLoadFunction<Response, Key, Context>
  getData?: (
    response: Response,
    request: ResourceKeyLoaderRequest<Key, Context>,
  ) => Promise<Data>
  getInaccessibleReason?: (
    response: Response,
    request: ResourceKeyLoaderRequest<Key, Context>,
  ) => any | Promise<any>
  isStale?: (
    response: Response,
    request: ResourceKeyLoaderRequest<Key, Context>,
  ) => boolean | Promise<boolean>
  isValidResponse?: (
    response: any,
    request: ResourceKeyLoaderRequest<Key, Context>,
  ) => boolean
  maxRetries?: number
}

export const defaultKeyLoaderOptions = {
  getData: (response: any) => response,
  getInaccessibleReason: (response: any) => response === null,
  isStale: () => false,
  isValidResponse: (response: any) => response !== undefined,
  maxRetries: 10,
}

export function createLoader<Data, Key = string, Context extends object = any>(
  loadFn: ResourceKeyLoadFunction<Data | null, Key, Context>,
): ResourceLoadStrategy<Data, Key, Context>
export function createLoader<
  Data,
  Response = Data,
  Key = string,
  Context extends object = any
>(
  options: ResourceKeyLoaderOptions<Data, Response, Key>,
): ResourceLoadStrategy<Data, Key, Context>
export function createLoader<
  Data,
  Response = Data,
  Key = string,
  Context extends object = any
>(
  optionsWithoutDefaults:
    | ResourceKeyLoaderOptions<Data, Response, Key, Context>
    | ResourceKeyLoadFunction<Response, Key, Context>,
): ResourceLoadStrategy<Data, Key, Context> {
  if (typeof optionsWithoutDefaults === 'function') {
    optionsWithoutDefaults = {
      load: optionsWithoutDefaults as ResourceKeyLoadFunction<
        Response,
        Key,
        Context
      >,
    }
  }
  const {
    load,
    getData,
    getInaccessibleReason,
    isStale,
    isValidResponse,
    maxRetries,
  } = {
    ...defaultKeyLoaderOptions,
    ...optionsWithoutDefaults,
  }

  return ({ abandon, context, error, keys, path, signal, update }) => {
    for (let key of keys) {
      const execute = exponentialBackoff({ maxRetries })
      const request = { context, key, path, signal }

      return execute({
        abandon,
        attempt: async () => {
          const response = (await load(request)) as Response
          if (!isValidResponse(response, request)) {
            return false
          }
          const inaccessibleReason = await getInaccessibleReason(
            response,
            request,
          )
          const stale = await isStale(response, request)
          const data = !inaccessibleReason
            ? await getData(response, request)
            : undefined
          const timestamp = Date.now()
          update({
            timestamp,
            changes: [
              {
                key,
                stale: stale,
                value: inaccessibleReason
                  ? {
                      status: 'inaccessible',
                      reason: inaccessibleReason,
                      timestamp,
                    }
                  : {
                      status: 'retrieved',
                      data,
                      timestamp,
                    },
              },
            ],
          })
          return true
        },
        error,
      })
    }
  }
}
