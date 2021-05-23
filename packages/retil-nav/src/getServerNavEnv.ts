import { NavEnv, NavParams, NavQuery } from './navTypes'
import { createHref, parseLocation, resolveAction } from './navUtils'

export interface ServerNavRequest {
  baseUrl?: string
  originalUrl?: string
  params?: NavParams
  query?: NavQuery
  url: string
}

export interface ServerNavResponse {
  getHeaders(): { [name: string]: number | string | string[] | undefined }
  setHeader(name: string, value: number | string | string[] | undefined): void
  statusCode: number
}

export interface ServerNavEnv<
  TRequest extends ServerNavRequest,
  TResponse extends ServerNavResponse,
> extends NavEnv {
  request: TRequest
  response: TResponse
}

export function getServerNavEnv<
  TRequest extends ServerNavRequest,
  TResponse extends ServerNavResponse,
>(request: TRequest, response: TResponse): ServerNavEnv<TRequest, TResponse> {
  const originalUrl =
    request.originalUrl ?? (request.baseUrl ?? '') + request.url
  const location = parseLocation(originalUrl)
  const redirect = async (
    statusOrAction: number | string,
    action?: string,
  ): Promise<void> => {
    const to = createHref(
      resolveAction(action || (statusOrAction as string), location.pathname),
    )

    response.setHeader('Location', to)
    response.statusCode =
      typeof statusOrAction === 'number' ? statusOrAction : 302
  }

  return {
    ...location,
    basename: request.baseUrl ?? '',
    getHeaders: () => response.getHeaders(),
    getStatusCode: () => response.statusCode,
    navKey: 'ssr',
    params: request.params || {},
    request,
    response,
    redirect,
    setHeader: (
      name: string,
      value: number | string | string[] | undefined,
    ) => {
      response.setHeader(name, value)
    },
    setStatusCode: (code: number) => {
      response.statusCode = code
    },
  }
}
