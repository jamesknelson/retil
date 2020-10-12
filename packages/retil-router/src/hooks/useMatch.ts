import { useMemo } from 'react'

import { createMatcher } from '../routerUtils'

import { useRequest } from './useRequest'

/**
 * Returns a boolean that indicates whether the user is currently
 * viewing the specified pattern.
 * @param pattern
 */
export const useMatch = (patterns: string | string[]): boolean => {
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
  const request = useRequest()
  return useMemo(() => !!matcher(request.pathname), [matcher, request])
}
