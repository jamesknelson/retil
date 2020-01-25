import { createDocLoader, ResourceDocLoaderRequest } from './docLoader'

export interface ResourceURLLoaderProps {
  fetchOptions?: RequestInit
}

export interface ResourceURLLoaderOptions<
  Props extends ResourceURLLoaderProps,
  Data,
  Rejection = string,
  Id = string
> {
  fetch?: typeof fetch

  getData?: (
    response: Response,
    request: ResourceDocLoaderRequest<Props, Id>,
  ) => Promise<Data>
  getRejection?: (
    response: Response,
    request: ResourceDocLoaderRequest<Props, Id>,
  ) =>
    | undefined
    | null
    | false
    | Rejection
    | Promise<undefined | null | false | Rejection>
  getRequest?: (
    request: ResourceDocLoaderRequest<Props, Id>,
  ) => string | ({ url: string } & Partial<RequestInit>)
  isValidResponse?: (
    response: Response,
    request: ResourceDocLoaderRequest<Props, Id>,
  ) => boolean

  maxRetries?: number
}

export const defaultURLLoaderOptions: ResourceURLLoaderOptions<
  ResourceURLLoaderProps,
  any,
  any,
  any
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
  getRejection: (response: Response) =>
    response.status > 400 && (response.statusText as any),
  getRequest: (
    request: ResourceDocLoaderRequest<ResourceURLLoaderProps, any>,
  ) => ({
    url: request.id,
    ...request.props.fetchOptions,
  }),
  isValidResponse: (response: Response) =>
    response && response.status >= 200 && response.status < 500,
}

export function createURLLoader<
  Props extends ResourceURLLoaderProps,
  Data,
  Rejection = string,
  Id = string
>(
  optionsWithoutDefaults: ResourceURLLoaderOptions<
    Props,
    Data,
    Rejection,
    Id
  > = {},
) {
  const {
    fetch,
    getData,
    getRejection,
    getRequest,
    isValidResponse,
    maxRetries,
  } = {
    ...defaultURLLoaderOptions,
    ...optionsWithoutDefaults,
  }

  return createDocLoader<Props, Data, Rejection, Response, Id>({
    load: request => fetch!(getRequest!(request) as RequestInfo),
    getData,
    getRejection,
    isValidResponse,
    maxRetries,
  })
}
