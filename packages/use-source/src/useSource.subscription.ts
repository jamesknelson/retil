import { useCallback, useMemo, useState, useEffect } from 'react'
import {
  GettableSourceCore,
  Source,
  hasSnapshot,
  nullSource,
} from 'retil-source'
import { useSubscription } from 'use-subscription'

const MissingToken = Symbol()

export function useSource(maybeSource: null, ...defaultValues: [] | [any]): null
export function useSource<T, U = T>(
  source: Source<T>,
  ...defaultValues: [] | [U]
): T | U
export function useSource<T = null, U = T>(
  maybeSource: Source<T> | null,
  ...defaultValues: [] | [U]
): T | U | null {
  const hasDefaultValue = defaultValues.length
  const [core, inputSelect] = maybeSource || nullSource
  const select = useMemo(
    () =>
      hasDefaultValue
        ? (core: GettableSourceCore) =>
            hasSnapshot([core, inputSelect]) ? inputSelect(core) : MissingToken
        : inputSelect,
    [hasDefaultValue, inputSelect],
  )
  const getCurrentValue = useCallback(() => select(core), [core, select])
  const subscribe = core[1]
  const subscription = useMemo(
    () => ({
      getCurrentValue,
      subscribe,
    }),
    [getCurrentValue, subscribe],
  )

  // useSubscription doesn't suspend if its value changes to a missing value.
  // This hack normalizes the it to act the same as useMutableSource.
  const [, setState] = useState()
  useEffect(() => {
    if (!hasDefaultValue) {
      return subscribe(() => {
        if (!hasSnapshot([core, select])) {
          setState(() => {
            select(core)
          })
        }
      })
    }
  }, [hasDefaultValue, core, select, subscribe])

  const value = useSubscription(subscription)
  return value === MissingToken ? defaultValues[0]! : value
}
