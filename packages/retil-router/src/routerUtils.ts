import {
  match as createMatchFunction,
  parse as parsePattern,
} from 'path-to-regexp'
import { normalizePathname } from 'retil-history'

import { RouterController, RouterHistoryState } from './routerTypes'

// Wait for a list of promises that may have grown by the time the first
// promises resolves.
export async function waitForMutablePromiseList(promises: PromiseLike<any>[]) {
  let count = 0
  while (count < promises.length) {
    await promises[count++]
  }
  promises.length = 0
}

export function getNoopController<
  Ext = {},
  State extends RouterHistoryState = RouterHistoryState
>(): RouterController<Ext, State> {
  return {
    back: () => Promise.resolve(false),
    block: () => () => {},
    navigate: () => Promise.resolve(false),
    forceNavigate: () => {},
    prefetch: () => Promise.reject(undefined),
    waitUntilStable: () => Promise.resolve(),
  }
}

export type Matcher = (pathname: string) => MatcherResult
export type MatcherResult = false | Match
export interface Match {
  /**
   * Excludes any final wildcards
   */
  pathname: string

  params: { [name: string]: string | string[] }
}
export function createMatcher(rawPattern: string): Matcher {
  let normalizedPattern = normalizePathname(rawPattern.replace(/^\.?\/?/, '/'))

  if (normalizedPattern.slice(normalizedPattern.length - 2) === '/*') {
    normalizedPattern =
      normalizedPattern.slice(0, normalizedPattern.length - 2) + '/(.*)?'
  } else if (normalizedPattern.slice(normalizedPattern.length - 1) === '*') {
    normalizedPattern =
      normalizedPattern.slice(0, normalizedPattern.length - 1) + '/(.*)?'
  } else if (normalizedPattern === '/*') {
    normalizedPattern = '/(.*)?'
  }

  const lastToken = parsePattern(normalizedPattern).pop()
  const wildcardParamName =
    lastToken && typeof lastToken !== 'string' && lastToken.pattern === '.*'
      ? String(lastToken.name)
      : undefined

  const matchFunction = createMatchFunction(normalizedPattern, {
    encode: encodeURI,
    decode: decodeURIComponent,
  })

  const matcher = (pathname: string) => {
    const match = matchFunction(pathname)
    if (match) {
      const params = match.params as any
      let wildcard = ''
      if (wildcardParamName) {
        wildcard = params[wildcardParamName] || ''
        delete params[wildcardParamName]
      }
      return {
        params,
        pathname: pathname
          .slice(0, pathname.length - wildcard.length)
          .replace(/\/$/, ''),
      }
    }
    return false
  }

  return matcher
}
