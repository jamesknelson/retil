import { createLoader, ResourceKeyLoaderRequest } from './keyLoader'

export interface ResourceURLLoaderContext {
  fetchOptions?: RequestInit
}

export interface ResourceURLLoaderOptions<
  Data,
  Key = string,
  Context extends ResourceURLLoaderContext = any
> {
  fetch?: typeof fetch

  getData?: (
    response: Response,
    request: ResourceKeyLoaderRequest<Key, Context>,
  ) => Promise<Data>
  getInaccessibleReason?: (
    response: Response,
    request: ResourceKeyLoaderRequest<Key, Context>,
  ) => any | Promise<any>
  getRequest?: (
    request: ResourceKeyLoaderRequest<Key, Context>,
  ) => string | ({ url: string } & Partial<RequestInit>)
  isStale?: (
    response: Response,
    request: ResourceKeyLoaderRequest<Key, Context>,
  ) => boolean | Promise<boolean>
  isValidResponse?: (
    response: Response,
    request: ResourceKeyLoaderRequest<Key, Context>,
  ) => boolean

  maxRetries?: number
}

export const defaultURLLoaderOptions: ResourceURLLoaderOptions<
  any,
  any,
  ResourceURLLoaderContext
> = {
  fetch: async (request: RequestInfo) => {
    // Avoid errors when the user is offline by skipping the fetch, and
    // retrying again later using exponential backoff.
    if (navigator.onLine) {
      return window.fetch(request)
    }
    return undefined as any
  },
  getData: async (response: Response) => await response.json(),
  getInaccessibleReason: (response: Response) =>
    response.status > 400 && response.statusText,
  getRequest: (
    request: ResourceKeyLoaderRequest<any, ResourceURLLoaderContext>,
  ) => ({
    url: request.key,
    ...request.context.fetchOptions,
  }),
  isStale: () => false,
  isValidResponse: (response: Response) =>
    response && response.status >= 200 && response.status < 500,
}

export function createURLLoader<
  Data,
  Key = string,
  Context extends ResourceURLLoaderContext = any
>(optionsWithoutDefaults: ResourceURLLoaderOptions<Data, Key, Context> = {}) {
  const {
    fetch,
    getData,
    getInaccessibleReason,
    getRequest,
    isStale,
    isValidResponse,
    maxRetries,
  } = {
    ...defaultURLLoaderOptions,
    ...optionsWithoutDefaults,
  }

  return createLoader<Data, Response, Key, Context>({
    load: request => fetch!(getRequest!(request) as RequestInfo),
    getData,
    getInaccessibleReason,
    isStale,
    isValidResponse,
    maxRetries,
  })
}
