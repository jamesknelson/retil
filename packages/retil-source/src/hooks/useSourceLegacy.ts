import { useCallback, useMemo, useState, useEffect } from 'react'
import { useSubscription } from 'use-subscription'

import {
  Source,
  getSnapshotPromise,
  hasSnapshot,
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
    if (!hasDefaultValue && !vector.length) {
      throw getSnapshotPromise([core, identitySelector])
    }
    return vector.length ? select(vector[0]) : MissingToken
  }, [core, hasDefaultValue, select])

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

  // useSubscription doesn't suspend if its value changes to a missing value.
  // This hack normalizes it to act the same as useMutableSource.
  const [, setState] = useState()
  useEffect(() => {
    if (!hasDefaultValue) {
      return subscribe(() => {
        if (!hasSnapshot([core])) {
          setState((() => {
            throw getSnapshotPromise([core, identitySelector])
          }) as any)
        }
      })
    }
  }, [hasDefaultValue, core, subscribe])

  const value = useSubscription(subscription)
  return value === MissingToken || maybeSource === null ? defaultValue! : value
}
