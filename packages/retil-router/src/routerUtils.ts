import {
  match as createMatchFunction,
  parse as parsePattern,
} from 'path-to-regexp'
import { normalizePathname, parseLocation } from 'retil-history'

import {
  RouterAction,
  RouterRouteSnapshot,
  RouterResponse,
} from './routerTypes'

// Wait for a list of promises that may have grown by the time the first
// promises resolves.
export async function waitForResponse(response: RouterResponse) {
  const promises = response.pendingSuspenses
  while (promises.length) {
    const waitingPromises = promises.slice(0)
    // Use `Promise.all` to eagerly start any lazy promises
    await Promise.all(waitingPromises)
    for (let i = 0; i < waitingPromises.length; i++) {
      const promise = waitingPromises[i]
      const pendingIndex = promises.indexOf(promise)
      if (pendingIndex !== -1) {
        promises.splice(pendingIndex, 1)
      }
    }
  }
}

export function createRequest<Ext extends object = {}>(
  action: RouterAction,
  ext?: Ext,
): RouterRouteSnapshot & Ext {
  return Object.assign(parseLocation(action), { basename: '', params: {} }, ext)
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

export function isRedirect(response: RouterResponse) {
  return response.status && response.status >= 300 && response.status < 400
}
