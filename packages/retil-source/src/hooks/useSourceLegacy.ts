import { useCallback, useMemo, useState, useEffect } from 'react'
import { useSubscription } from 'use-subscription'

import { GettableSourceCore, Source, hasSnapshot, nullSource } from '../source'

import { UseSourceFunction, UseSourceOptions } from './useSourceType'

const MissingToken = Symbol()

export const useSourceLegacy: UseSourceFunction = <T = null, U = T>(
  maybeSource: Source<T> | null,
  options: UseSourceOptions<U> = {},
): T | U | null => {
  const hasDefaultValue = 'defaultValue' in options
  const { defaultValue, startTransition } = options
  const [core, inputSelect] = maybeSource || nullSource
  const select = useCallback(
    ([getVersion]: GettableSourceCore) =>
      hasDefaultValue && !hasSnapshot([[getVersion], inputSelect])
        ? MissingToken
        : inputSelect(getVersion()),
    [hasDefaultValue, inputSelect],
  )
  const getCurrentValue = useCallback(() => select(core), [core, select])

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
            // Because hasSnapshot returns false, this'll throw a promise.
            select(core)
          }) as any)
        }
      })
    }
  }, [hasDefaultValue, core, select, subscribe])

  const value = useSubscription(subscription)
  return value === MissingToken || maybeSource === null ? defaultValue! : value
}
