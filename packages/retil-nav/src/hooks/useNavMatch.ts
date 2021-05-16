import { useMemo } from 'react'

import { createMatcher } from '../matcher'
import { useNavEnv } from '../navContext'

/**
 * Returns a boolean that indicates whether the user is currently
 * viewing the specified pattern.
 * @param pattern
 */
export const useNavMatch = (patterns: string | string[]): boolean => {
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
  const env = useNavEnv()
  return useMemo(() => !!matcher(env.pathname), [matcher, env])
}
