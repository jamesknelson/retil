import { useCallback, useMemo } from 'react'
import { useSubscription } from 'use-subscription'

import {
  Source,
  getSnapshotPromise,
  identitySelector,
  nullSource,
} from '../source'

import { UseSourceFunction, UseSourceOptions } from './useSourceType'

const MissingToken = Symbol()

export const useSourceLegacy: UseSourceFunction = <T = null, U = T>(
  maybeSource: Source<T> | null,
  options: UseSourceOptions<U> = {},
): T | U | null => {
  const hasDefaultValue = 'defaultValue' in options
  const { defaultValue, startTransition } = options
  const [core, select] = maybeSource || nullSource
  const getCurrentValue = useCallback(() => {
    const vector = core[0]()
    return vector.length ? select(vector[0]) : MissingToken
  }, [core, select])
  const subscribe = useMemo(
    () =>
      startTransition
        ? (callback: () => void) =>
            core[1](() => {
              startTransition(callback)
            })
        : core[1],
    [core, startTransition],
  )
  const subscription = useMemo(
    () => ({
      getCurrentValue,
      subscribe,
    }),
    [getCurrentValue, subscribe],
  )
  const value = useSubscription(subscription)

  if (value === MissingToken && !hasDefaultValue) {
    throw getSnapshotPromise([core, identitySelector])
  }

  return value === MissingToken || maybeSource === null ? defaultValue! : value
}
