import { noop } from 'retil-support'

import {
  NavAction,
  NavEnv,
  NavSnapshot,
  NavRedirectFunction,
  NavRequest,
  NavResponse,
} from './navTypes'
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
  const redirect: NavRedirectFunction = (
    statusOrAction: number | NavAction,
    maybeAction?: NavAction,
  ): null => {
    const specifiesStatus = typeof statusOrAction === 'number'
    const status = specifiesStatus ? statusOrAction : 302
    const action = (specifiesStatus ? maybeAction : statusOrAction) as NavAction
    const to = createHref(resolveAction(action, location.pathname))

    response.setHeader('Location', to)
    response.statusCode = status

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
