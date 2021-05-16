import { NavEnv, NavParams, NavQuery, NavResponse } from './navTypes'
import { createHref, parseLocation, resolveAction } from './navUtils'

export interface StaticNavRequest {
  baseUrl?: string
  originalUrl?: string
  params?: NavParams
  query?: NavQuery
  url: string
}

export interface StaticNavEnv<
  TRequest extends StaticNavRequest,
  TResponse extends NavResponse,
> extends NavEnv {
  request: TRequest
  response: TResponse
}

export function getStaticNavEnv<
  TRequest extends StaticNavRequest,
  TResponse extends NavResponse,
>(request: TRequest, response: TResponse): StaticNavEnv<TRequest, TResponse> {
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
    navKey: 'ssr',
    params: request.params || {},
    request,
    response,
    redirect,
  }
}
