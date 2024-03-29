import { noop } from 'retil-support'

import {
  NavAction,
  NavEnv,
  NavRedirectFunction,
  NavResponse,
  NavSnapshot,
} from './navTypes'
import { createHref, parseLocation, resolveAction } from './navUtils'
import { NotFoundError } from './notFoundError'

export interface StaticNavEnv<TResponse extends NavResponse>
  extends NavEnv<never, TResponse> {
  request?: undefined
  response: TResponse
}

export interface CreateStaticNavEnvOptions<TResponse extends NavResponse> {
  url: string
  basename?: string
  response?: TResponse
}

export function createStaticNavEnv<TResponse extends NavResponse>(
  options: CreateStaticNavEnvOptions<TResponse>,
): StaticNavEnv<TResponse> {
  const {
    url,
    basename = '',
    response = createStaticNavResponse() as TResponse,
  } = options

  const location = parseLocation(url)

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

    if (response.setHeader) {
      response.setHeader('Location', to)
    }
    response.statusCode = status

    return null
  }

  const nav: NavSnapshot = {
    ...location,
    basename,
    key: 'static',
    matchname: basename,
    notFound,
    params: {},
    precache: noop,
    redirect,
  }

  const navEnv = {
    nav,
    response,
  }

  return navEnv
}

export function createStaticNavResponse(): NavResponse {
  const headers = {} as Record<string, number | string | string[] | undefined>
  const getHeaders = () => headers
  const setHeader = (
    name: string,
    value: number | string | string[] | undefined,
  ) => {
    headers[name] = value
  }

  return {
    getHeaders,
    setHeader,
  }
}
