import { ReactNode } from 'react'
import { Loader } from 'retil-mount'

import { NavEnv } from '../navTypes'
import { Matcher, createMatcher } from '../matcher'
import { joinPathnames } from '../navUtils'

import { notFoundLoader } from './notFound'

export interface MatchOptions<
  TEnv extends object = object,
  TContent = ReactNode,
> {
  [pattern: string]: Loader<TEnv, TContent> | TContent
}

export function match<TEnv extends object = object, TContent = ReactNode>(
  handlers: MatchOptions<TEnv, TContent>,
): Loader<TEnv & NavEnv> {
  const tests: [Matcher, Loader<TEnv>][] = []

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
    const { basename, pathname } = env
    const unmatchedPathname =
      (pathname.slice(0, basename.length) === basename
        ? pathname.slice(basename.length)
        : pathname) || '/'

    for (const [matcher, router] of tests) {
      const match = matcher(unmatchedPathname)
      if (match) {
        return router({
          ...env,
          basename: joinPathnames(basename, match.pathname),
          params: { ...env.params, ...match.params },
        })
      }
    }

    return notFoundLoader(env)
  }
}
