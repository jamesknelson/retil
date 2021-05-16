import {
  match as createMatchFunction,
  parse as parsePattern,
} from 'path-to-regexp'

import { normalizePathname } from './navUtils'

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
