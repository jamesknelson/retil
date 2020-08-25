import { useMemo } from 'react'

import { createMatcher } from '../routerUtils'

import { useRequest } from './useRequest'

/**
 * Returns a boolean that indicates whether the user is currently
 * viewing the specified pattern.
 * @param pattern
 */
export const useMatch = (pattern: string): boolean => {
  const matcher = useMemo(() => createMatcher(pattern), [pattern])
  const request = useRequest()
  return useMemo(() => !!matcher(request.pathname), [matcher, request])
}
