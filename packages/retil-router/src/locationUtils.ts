import { parsePath } from 'history'
import { parse as parseQuery, stringify as stringifyQuery } from 'querystring'

import {
  HistoryAction,
  HistoryActionObject,
  HistoryLocation,
  HistoryState,
} from './historyTypes'

export function createHref(request: HistoryActionObject<any>): string {
  return (
    encodeURI(normalizePathname(request.pathname || '')) +
    (request.search || '') +
    (request.hash || '')
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

// users/789/, profile     => users/789/profile/
// /users/123, .           => /users/123
// /users/123, ..          => /users
// /users/123, ../..       => /
// /a/b/c/d,   ../../one   => /a/b/one
// /a/b/c/d,   .././one/   => /a/b/c/one/
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
    // Allow empty segments on the first character, so that leading
    // slashes will not be affected.
    else if (segment !== '.' && (segment !== '' || i === 0)) {
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
  return decodeURI(
    pathname
      .replace(/\/+/g, '/')
      .replace(/(.)\/$/, '$1')
      .normalize(),
  )
}

export function resolveAction<S extends HistoryState = HistoryState>(
  action: string | HistoryAction<S>,
  currentPathname: string,
): HistoryLocation<S> {
  if (isExternalHref(action)) {
    throw new Error(
      'retil-router: applyAction cannot be applied to external URLs',
    )
  }

  const parsedAction = parseAction(action)

  let pathname = parsedAction.pathname

  // If no relativity specifier is provided, use the browser default of
  // replacing the last segment.
  if (pathname) {
    pathname =
      pathname[0] === '/'
        ? pathname
        : joinPaths(
            currentPathname,
            /^\.\.?\//.test(pathname) ? '.' : '..',
            pathname,
          )
  }

  return {
    hash: parsedAction.hash || '',
    pathname: normalizePathname(pathname || currentPathname),
    query: parsedAction.query || {},
    search: parsedAction.search || '',
    state: parsedAction.state || null,
  }
}

export function parseAction<S extends HistoryState = HistoryState>(
  input: string | HistoryAction<S>,
  state?: S,
): Exclude<HistoryAction<S>, string> {
  const action: HistoryAction<S> =
    typeof input === 'string' ? parsePath(input) : { ...input }

  if (state) {
    action.state = state
  }

  if (action.search) {
    if (!action.query) {
      action.query = parseQuery(action.search.slice(1))
    } else if (process.env.NODE_ENV !== 'production') {
      const stringifiedActionQuery = stringifyQuery(action.query)
      if (stringifiedActionQuery !== action.search.slice(1)) {
        console.error(
          `A path was provided with differing "search" and "query" parameters. Ignoring "search" in favor of "query".`,
        )
      }
    }
  }
  if (action.query) {
    const stringifiedQuery = stringifyQuery(action.query)
    action.search = stringifiedQuery ? '?' + stringifiedQuery : ''
  }

  if (action.pathname) {
    action.pathname = decodeURI(action.pathname)
  }

  return action
}

export function parseLocation<S extends HistoryState = HistoryState>(
  input: string | HistoryAction<S>,
): HistoryLocation<S> {
  return {
    hash: '',
    pathname: '',
    query: {},
    search: '',
    state: null,
    ...parseAction(input),
  }
}

export function getActionKey(action: HistoryAction<any>): [any, string] {
  const parsedAction = parseAction(action)
  return [parsedAction.state, createHref(parsedAction)]
}

export interface ActionMap<T> {
  clear(): void
  delete(action: HistoryAction<any>): void
  get(action: HistoryAction<any>): T | undefined
  set(action: HistoryAction<any>, value: T): void
}

export function createActionMap<T>(): ActionMap<T> {
  const map = new Map<any, { [url: string]: T }>()

  const clear = () => map.clear()

  const del = (action: HistoryAction<any>): void => {
    const [state, url] = getActionKey(action)
    const innerMap = map.get(state)
    if (innerMap) {
      delete innerMap[url]
      if (!Object.keys(innerMap).length) {
        map.delete(state)
      }
    }
  }

  const get = (action: HistoryAction<any>): T | undefined => {
    const [state, url] = getActionKey(action)
    const innerMap = map.get(state)
    return innerMap && innerMap[url]
  }

  const set = (action: HistoryAction<any>, value: T): void => {
    const [state, url] = getActionKey(action)
    const innerMap = map.get(state)
    if (!innerMap) {
      map.set(state, { [url]: value })
    } else {
      innerMap[url] = value
    }
  }

  return { clear, delete: del, get, set }
}
