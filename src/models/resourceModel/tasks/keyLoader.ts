/**
 * Load individual keys separaetly, using exponential backoff.
 */

import { exponentialBackoff } from '../../../utils/exponentialBackoff'

import { ResourceLoader } from '../types'

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
  getRejection?: (
    response: Response,
    request: ResourceKeyLoaderRequest<Key, Context>,
  ) =>
    | undefined
    | null
    | false
    | string
    | Promise<undefined | null | false | string>
  isValidResponse?: (
    response: any,
    request: ResourceKeyLoaderRequest<Key, Context>,
  ) => boolean
  maxRetries?: number
}

export const defaultKeyLoaderOptions = {
  getData: (response: any) => response,
  getRejection: (response: any) => (response === null ? 'notFound' : null),
  isValidResponse: (response: any) => response !== undefined,
  maxRetries: 10,
}

export function createKeyLoader<
  Data,
  Key = string,
  Context extends object = any
>(
  loadFn: ResourceKeyLoadFunction<Data | null, Key, Context>,
): ResourceLoader<Data, Key, Context>
export function createKeyLoader<
  Data,
  Response = Data,
  Key = string,
  Context extends object = any
>(
  options: ResourceKeyLoaderOptions<Data, Response, Key>,
): ResourceLoader<Data, Key, Context>
export function createKeyLoader<
  Data,
  Response = Data,
  Key = string,
  Context extends object = any
>(
  optionsWithoutDefaults:
    | ResourceKeyLoaderOptions<Data, Response, Key, Context>
    | ResourceKeyLoadFunction<Response, Key, Context>,
): ResourceLoader<Data, Key, Context> {
  if (typeof optionsWithoutDefaults === 'function') {
    optionsWithoutDefaults = {
      load: optionsWithoutDefaults as ResourceKeyLoadFunction<
        Response,
        Key,
        Context
      >,
    }
  }
  const { load, getData, getRejection, isValidResponse, maxRetries } = {
    ...defaultKeyLoaderOptions,
    ...optionsWithoutDefaults,
  }

  return ({
    abandon,
    context,
    error,
    keys,
    path,
    setData,
    setRejection,
    signal,
  }) => {
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
          const rejectionReason = await getRejection(response, request)
          if (rejectionReason) {
            setRejection([[key, rejectionReason]])
            return true
          }
          const data = !rejectionReason
            ? await getData(response, request)
            : undefined
          setData([[key, data]])
          return true
        },
        error,
      })
    }
  }
}
