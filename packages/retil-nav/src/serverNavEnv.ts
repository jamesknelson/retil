import { noop } from 'retil-support'

import { NavEnv, NavSnapshot, NavRequest, NavResponse } from './navTypes'
import { createHref, parseLocation, resolveAction } from './navUtils'
import { NotFoundError } from './notFoundError'

export interface ServerNavEnv<
  TRequest extends NavRequest,
  TResponse extends NavResponse,
> extends NavEnv<TRequest, TResponse> {
  request: TRequest
  response: TResponse
}

export function createServerNavEnv<
  TRequest extends NavRequest,
  TResponse extends NavResponse,
>(request: TRequest, response: TResponse): ServerNavEnv<TRequest, TResponse> {
  const originalUrl =
    request.originalUrl ?? (request.baseUrl ?? '') + request.url
  const location = parseLocation(originalUrl)
  const basename = request.baseUrl ?? ''
  const notFound = () => {
    response.statusCode = 404
    throw new NotFoundError(nav)
  }
  const redirect = async (
    statusOrAction: number | string,
    action?: string,
  ): Promise<null> => {
    const to = createHref(
      resolveAction(action || (statusOrAction as string), location.pathname),
    )

    response.setHeader('Location', to)
    response.statusCode =
      typeof statusOrAction === 'number' ? statusOrAction : 302

    return null
  }

  const nav: NavSnapshot = {
    ...location,
    basename,
    key: 'ssr',
    matchname: basename,
    notFound,
    params: request.params || {},
    redirect,
    precache: noop,
  }

  const navEnv = {
    nav,
    request,
    response,
  }

  return navEnv
}
