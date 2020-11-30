import { useMemo } from 'react'

import { createMatcher } from '../routerUtils'

import { useRouterRequest } from './useRouterRequest'

/**
 * Returns a boolean that indicates whether the user is currently
 * viewing the specified pattern.
 * @param pattern
 */
export const useMatchRoute = (patterns: string | string[]): boolean => {
  const matcher = useMemo(
    () =>
      typeof patterns === 'string'
        ? createMatcher(patterns)
        : (pathname: string) => {
            const matchers = patterns.map(createMatcher)
            return matchers.some((matcher) => matcher(pathname))
          },
    [patterns],
  )
  const request = useRouterRequest()
  return useMemo(() => !!matcher(request.pathname), [matcher, request])
}
