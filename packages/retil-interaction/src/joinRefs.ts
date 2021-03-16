import { useMemo } from 'react'
import { memoizeOne } from 'retil-support'

export function useJoinRefs() {
  return useMemo(() => memoizeOne(joinRefs), [])
}

export function joinRefs<T>(
  x: React.RefCallback<T>,
  y?: React.RefCallback<T> | React.MutableRefObject<T | null> | null,
): React.RefCallback<T>
export function joinRefs<T>(
  x: React.RefCallback<T> | React.MutableRefObject<T | null> | null | undefined,
  y: React.RefCallback<T>,
): React.RefCallback<T>
export function joinRefs<T>(
  x?: React.RefCallback<T> | React.MutableRefObject<T | null> | null,
  y?: React.RefCallback<T> | React.MutableRefObject<T | null> | null,
): React.Ref<T> | null
export function joinRefs<T>(
  x?: React.RefCallback<T> | React.MutableRefObject<T | null> | null,
  y?: React.RefCallback<T> | React.MutableRefObject<T | null> | null,
): React.Ref<T> | null {
  return (
    (!x || !y
      ? x || y
      : (value: T | null) => {
          if (typeof x === 'function') {
            x(value)
          } else {
            x.current = value
          }
          if (typeof y === 'function') {
            y(value)
          } else {
            y.current = value
          }
        }) || null
  )
}
