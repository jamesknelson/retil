import {
  MatchFunction,
  match as createMatchFunction,
  parse as parsePattern,
} from 'path-to-regexp'
import * as React from 'react'
import { normalizePathname } from 'retil-history'

import { RouterFunction, RouterRequest, RouterResponse } from '../routerTypes'

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
  const tests: {
    matchFunction: MatchFunction
    pattern: string
    router: RouterFunction<Request, Response>
    wildcardParamName?: string
  }[] = []

  const patterns = Object.keys(handlers)
  for (const rawPattern of patterns) {
    const handler = handlers[rawPattern]
    const router = routeProvide(
      typeof handler === 'function'
        ? (handler as RouterFunction<Request, Response>)
        : () => <>{handler}</>,
    )

    let pattern = normalizePathname(rawPattern.replace(/^\.?\/?/, '/'))

    if (pattern.slice(pattern.length - 2) === '/*') {
      pattern = pattern.slice(0, pattern.length - 2) + '/(.*)?'
    } else if (pattern.slice(pattern.length - 1) === '*') {
      pattern = pattern.slice(0, pattern.length - 1) + '/(.*)?'
    } else if (pattern === '/*') {
      pattern = '/(.*)?'
    }

    const lastToken = parsePattern(pattern).pop()
    tests.push({
      matchFunction: createMatchFunction(pattern, {
        encode: encodeURI,
        decode: decodeURIComponent,
      }),
      pattern,
      router,
      wildcardParamName:
        lastToken && typeof lastToken !== 'string' && lastToken.pattern === '.*'
          ? String(lastToken.name)
          : undefined,
    })
  }

  return (request, response) => {
    const { basename, pathname } = request
    const unmatchedPathname =
      (pathname.slice(0, basename.length) === basename
        ? pathname.slice(basename.length)
        : pathname) || '/'

    for (const test of tests) {
      const match = test.matchFunction(unmatchedPathname)
      if (match) {
        const params = match.params as any
        let wildcard = ''
        if (test.wildcardParamName) {
          wildcard = params[test.wildcardParamName] || ''
          delete params[test.wildcardParamName]
        }
        return test.router(
          {
            ...request,
            basename:
              test.pattern === '/(.*)?'
                ? basename
                : pathname
                    .slice(0, pathname.length - wildcard.length)
                    .replace(/\/$/, ''),
            params: { ...request, ...params },
          },
          response,
        )
      }
    }

    return notFoundRouter(request, response)
  }
}
