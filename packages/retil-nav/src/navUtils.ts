import { parse as parseQuery, stringify as stringifyQuery } from 'querystring'

import { NavAction, NavActionObject, NavLocation, NavQuery } from './navTypes'

function splitPath(path: string): string[] {
  if (path === '') {
    return []
  }
  return path.split('/')
}

// users/789/, profile     => users/789/profile/
// /users/123, .           => /users/123
// /users/123, ..          => /users
// /users/123, ../..       => /
// /a/b/c/d,   ../../one   => /a/b/one
// /a/b/c/d,   .././one/   => /a/b/c/one/
export function joinPathnames(base: string, ...paths: string[]): string {
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

export function normalizePathname(pathname: string): string {
  const intermediate = decodeURI(
    pathname
      .replace(/\/+/g, '/')
      .replace(/(.)\/$/, '$1')
      .normalize(),
  )

  if (intermediate === '/' || intermediate === '') {
    return '/'
  } else {
    const pathnameWithLeadingSlash =
      intermediate[0] !== '/' ? '/' + intermediate : intermediate
    return pathnameWithLeadingSlash[pathnameWithLeadingSlash.length - 1] === '/'
      ? pathnameWithLeadingSlash.slice(0, pathnameWithLeadingSlash.length - 1)
      : pathnameWithLeadingSlash
  }
}

export function parseLocation(input: NavAction, state?: object): NavLocation {
  const parsedAction = parseAction(input, state)

  if (parsedAction?.pathname !== undefined) {
    parsedAction.pathname = normalizePathname(parsedAction.pathname)
  }

  return {
    hash: '',
    pathname: '',
    query: {},
    search: '',
    state: null,
    ...parsedAction,
  }
}

export function createHref(request: NavActionObject): string {
  return (
    encodeURI(normalizePathname(request.pathname || '')) +
    (request.search || '') +
    (request.hash || '')
  )
}

/**
 * Parses a string URL path into its separate pathname, search, and hash components.
 *
 * @see https://github.com/ReactTraining/history/tree/master/docs/api-reference.md#parsepath
 */
export function parseHref(href: string): NavActionObject {
  const action: NavActionObject = {}

  if (href) {
    const hashIndex = href.indexOf('#')
    if (hashIndex !== -1) {
      action.hash = href.substr(hashIndex)
      href = href.substr(0, hashIndex)
    }

    const searchIndex = href.indexOf('?')
    if (searchIndex !== -1) {
      action.search = href.substr(searchIndex)
      href = href.substr(0, searchIndex)
    }

    if (href.length > 0) {
      action.pathname = href
    }
  }

  return action
}

export function isExternalAction(href: NavAction) {
  // If this is an external link, return undefined so that the native
  // response will be used.
  return (
    !href ||
    (typeof href === 'string' &&
      (href.indexOf('://') !== -1 || href.indexOf('mailto:') === 0))
  )
}

export function areActionsEqual(x: NavAction, y: NavAction): boolean {
  const px = parseAction(x)
  const py = parseAction(y)

  return (
    px.hash !== py.hash ||
    px.pathname !== py.pathname ||
    px.search !== py.search ||
    px.state !== py.state
  )
}

export function resolveAction(
  action: NavAction,
  currentPathname: string,
  basename = '',
): NavLocation {
  if (isExternalAction(action)) {
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
        : joinPathnames(
            currentPathname,
            /^\.\.?\//.test(pathname) ? '.' : '..',
            pathname,
          )

    if (pathname.slice(0, basename.length) !== basename) {
      pathname = joinPathnames(basename, pathname)
    }
  }

  return {
    hash: parsedAction.hash || '',
    pathname: normalizePathname(pathname || currentPathname),
    query: parsedAction.query || {},
    search: parsedAction.search || '',
    state: parsedAction.state || null,
  }
}

export function parseAction(
  input: NavAction,
  state?: object,
): Exclude<NavAction, string> {
  const action: NavAction =
    typeof input === 'string' ? parseHref(input) : { ...input }

  if (state) {
    action.state = state
  }

  if (action.search) {
    if (!action.query) {
      action.query = parseQuery(action.search.slice(1)) as NavQuery
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
