import { useCallback } from 'react'

import { createMatcher } from '../matcher'
import { useNavSnapshot } from '../navContext'

import { useNavResolve } from './useNavResolve'

export const useNavMatch = (): ((actionPattern: string) => boolean) => {
  const resolve = useNavResolve()
  const { pathname } = useNavSnapshot()
  return useCallback(
    (actionPattern: string) =>
      !!createMatcher(resolve(actionPattern).pathname)(pathname),
    [pathname, resolve],
  )
}
