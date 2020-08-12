import { useCallback, useMemo, useState, useEffect } from 'react'
import { Source, hasSnapshot } from '@retil/source'
import { useSubscription } from 'use-subscription'

export function useSource<T, U = T>(
  source: Source<T>,
  defaultValue?: U,
): T | U {
  const [getSnapshot, subscribe] = source
  const hasDefaultValue = arguments.length > 1
  const getCurrentValue = useCallback(
    () =>
      hasSnapshot([getSnapshot]) || !hasDefaultValue
        ? getSnapshot()
        : (defaultValue as U),
    [hasDefaultValue, defaultValue, getSnapshot],
  )
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
        if (!hasSnapshot([getSnapshot])) {
          setState(() => {
            getSnapshot()
          })
        }
      })
    }
  }, [hasDefaultValue, getSnapshot, subscribe])

  return useSubscription(subscription)
}
