import * as React from 'react'
import { joinPaths } from 'retil-history'

import { RouterFunction, RouterRequest, RouterResponse } from '../routerTypes'
import { Matcher, createMatcher } from '../routerUtils'

import { routeNotFound } from './routeNotFound'
import { routeProvide } from './routeProvide'

const notFoundRouter = routeNotFound()

export interface CreatePatternRouterOptions<
  Request extends RouterRequest,
  Response extends RouterResponse
> {
  [pattern: string]: React.ReactNode | RouterFunction<Request, Response>
}

export function routeByPattern<
  Request extends RouterRequest,
  Response extends RouterResponse
>(
  handlers: CreatePatternRouterOptions<Request, Response>,
): RouterFunction<Request, Response> {
  const tests: [Matcher, RouterFunction<Request, Response>][] = []

  const patterns = Object.keys(handlers)
  for (const rawPattern of patterns) {
    const handler = handlers[rawPattern]
    const router = routeProvide(
      typeof handler === 'function'
        ? (handler as RouterFunction<Request, Response>)
        : () => <>{handler}</>,
    )

    const matcher = createMatcher(rawPattern)
    tests.push([matcher, router])
  }

  return (request, response) => {
    const { basename, pathname } = request
    const unmatchedPathname =
      (pathname.slice(0, basename.length) === basename
        ? pathname.slice(basename.length)
        : pathname) || '/'

    for (const [matcher, router] of tests) {
      const match = matcher(unmatchedPathname)
      if (match) {
        return router(
          {
            ...request,
            basename: joinPaths(basename, match.pathname),
            params: { ...request.params, ...match.params },
          },
          response,
        )
      }
    }

    return notFoundRouter(request, response)
  }
}
