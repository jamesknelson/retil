import { parsePath } from 'history'
import { parse as parseQuery, stringify as stringifyQuery } from 'querystring'

import {
  HistoryAction,
  HistoryActionObject,
  HistoryLocation,
  HistoryState,
} from './history'

export function createHref(request: HistoryActionObject<any>): string {
  return (
    (request.pathname || '') + (request.search || '') + (request.hash || '')
  )
}

export function isExternalHref(href: string | HistoryAction<any>) {
  // If this is an external link, return undefined so that the native
  // response will be used.
  return (
    !href ||
    (typeof href === 'string' &&
      (href.indexOf('://') !== -1 || href.indexOf('mailto:') === 0))
  )
}

// users/789/, profile      => users/789/profile/
// /users/123, .           => /users/123
// /users/123, ..          => /users
// /users/123, ../..       => /
// /a/b/c/d,   ../../one   => /a/b/one
// /a/b/c/d,   .././one/    => /a/b/c/one/
export function joinPaths(base: string, ...paths: string[]): string {
  let allSegments = splitPath(base)
  for (let i = 0; i < paths.length; i++) {
    allSegments.push(...splitPath(paths[i]))
  }

  let pathSegments: string[] = []
  let lastSegmentIndex = allSegments.length - 1
  for (let i = 0; i <= lastSegmentIndex; i++) {
    let segment = allSegments[i]
    if (segment === '..') {
      pathSegments.pop()
    }
    // Allow empty segments on the first and final characters, so that leading
    // and trailing slashes will not be affected.
    else if (
      segment !== '.' &&
      (segment !== '' || i === 0 || i === lastSegmentIndex)
    ) {
      pathSegments.push(segment)
    }
  }

  return pathSegments.join('/')
}

function splitPath(path: string): string[] {
  if (path === '') {
    return []
  }
  return path.split('/')
}

export function normalizePathname(pathname: string): string {
  return decodeURI(pathname).replace(/\/+/g, '/').replace(/\/$/, '').normalize()
}

export function applyLocationAction<S extends HistoryState = HistoryState>(
  location: HistoryLocation<S>,
  action: string | HistoryAction<S>,
  state?: S,
): HistoryLocation<S> {
  if (isExternalHref(action)) {
    throw new Error(
      'retil-router: applyAction cannot be applied to external URLs',
    )
  }

  // If no relativity specifier is provided, use the browser default of
  // replacing the last segment.
  if (typeof action === 'string') {
    action =
      action[0] === '/'
        ? action
        : joinPaths(
            location.pathname,
            /^\.\.?\//.test(action) ? '.' : '..',
            action,
          )
  }

  const parsedAction = parseAction(action, state)

  return {
    hash: parsedAction.hash || '',
    pathname: parsedAction.pathname || location.pathname,
    query: parsedAction.query || {},
    search: parsedAction.search || '',
    state: parsedAction.state || ({} as S),
  }
}

export function parseAction<S extends HistoryState = HistoryState>(
  input: string | HistoryAction<S>,
  state?: S,
): Exclude<HistoryAction<S>, string> {
  const delta: HistoryAction<S> =
    typeof input === 'string' ? parsePath(input) : { ...input }

  if (state) {
    delta.state = state
  }

  if (delta.search) {
    if (delta.query) {
      console.error(
        `A path was provided with both "search" and "query" parameters. Ignoring "search" in favor of "query".`,
      )
    } else {
      delta.query = parseQuery(delta.search.slice(1))
    }
  } else if (delta.query) {
    delta.search = stringifyQuery(delta.query)
  }

  return delta
}

export function parseLocation<S extends HistoryState = HistoryState>(
  input: string | HistoryAction<S>,
): HistoryLocation<S> {
  return {
    hash: '',
    pathname: '',
    query: {},
    search: '',
    state: {} as S,
    ...parseAction(input),
  }
}
