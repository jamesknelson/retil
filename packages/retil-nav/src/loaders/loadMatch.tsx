import { ReactElement, ReactNode } from 'react'
import { Loader } from 'retil-mount'

import { NavEnv } from '../navTypes'
import { Matcher, createMatcher } from '../matcher'
import { joinPathnames } from '../navUtils'

import { notFoundLoader } from './loadNotFoundBoundary'

export interface LoadMatchOptions<
  TEnv extends NavEnv = NavEnv,
  TContent = ReactNode,
> {
  [pattern: string]: Loader<TEnv, TContent> | TContent
}

export function loadMatch<TEnv extends NavEnv = NavEnv, TContent = ReactNode>(
  handlers: LoadMatchOptions<TEnv, TContent>,
): Loader<TEnv, TContent | ReactElement> {
  const tests: [Matcher, Loader<TEnv, TContent>][] = []

  const patterns = Object.keys(handlers)
  for (const rawPattern of patterns) {
    const handler = handlers[rawPattern]
    const loader =
      typeof handler === 'function'
        ? (handler as Loader<TEnv, TContent>)
        : () => handler as TContent

    const matcher = createMatcher(rawPattern)
    tests.push([matcher, loader])
  }

  return (env) => {
    const { matchname, pathname, params } = env.nav
    const unmatchedPathname =
      (pathname.slice(0, matchname.length) === matchname
        ? pathname.slice(matchname.length)
        : pathname) || '/'

    for (const [matcher, router] of tests) {
      const match = matcher(unmatchedPathname)
      if (match) {
        return router({
          ...env,
          nav: {
            ...env.nav,
            matchname: joinPathnames(matchname, match.pathname),
            params: { ...params, ...match.params },
          },
        })
      }
    }

    return notFoundLoader(env)
  }
}
