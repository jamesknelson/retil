import { useCallback } from 'react'

import { createMatcher } from '../matcher'
import { useNavSnapshot } from '../navContext'

import { useNavResolver } from './useNavResolver'

export const useNavMatcher = (): ((actionPattern: string) => boolean) => {
  const resolve = useNavResolver()
  const { pathname } = useNavSnapshot()
  return useCallback(
    (actionPattern: string) =>
      !!createMatcher(resolve(actionPattern).pathname)(pathname),
    [pathname, resolve],
  )
}
