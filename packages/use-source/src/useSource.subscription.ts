import { useCallback, useMemo, useState, useEffect } from 'react'
import {
  Source,
  getSnapshot,
  hasSnapshot,
  nullSource,
  selectDefault,
} from 'retil-source'
import { useSubscription } from 'use-subscription'

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
  const maybeDefaultValue = defaultValues[0]
  const inputSource = useMemo(
    () => maybeSource || nullSource,
    // Sources are arrays, and if their items are equal, they're equivalent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    maybeSource || nullSource,
  )
  const source = useMemo(
    () =>
      hasDefaultValue
        ? selectDefault(inputSource, maybeDefaultValue as U)
        : inputSource,
    [inputSource, hasDefaultValue, maybeDefaultValue],
  )
  const [get, select, subscribe] = source
  const getCurrentValue = useCallback(() => select(get), [select, get])
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
        if (!hasSnapshot([get, select])) {
          setState(() => {
            getSnapshot([get, select])
          })
        }
      })
    }
  }, [hasDefaultValue, get, select, subscribe])

  return useSubscription(subscription)
}
