import memoizeOne from 'memoize-one'
import { MutableRefObject, Ref, RefCallback, useMemo } from 'react'

export function joinRefs<T>(
  x: RefCallback<T>,
  y?: RefCallback<T> | MutableRefObject<T | null> | null,
  ...zs: (RefCallback<T> | MutableRefObject<T | null> | null | undefined)[]
): RefCallback<T>
export function joinRefs<T>(
  x: RefCallback<T> | MutableRefObject<T | null> | null | undefined,
  y: RefCallback<T>,
  ...zs: (RefCallback<T> | MutableRefObject<T | null> | null | undefined)[]
): RefCallback<T>
export function joinRefs<T>(
  x: Ref<T>,
  y?: RefCallback<T> | MutableRefObject<T | null> | null,
  ...zs: (RefCallback<T> | MutableRefObject<T | null> | null | undefined)[]
): Ref<T>
export function joinRefs<T>(
  x?: RefCallback<T> | MutableRefObject<T | null> | null,
  y?: RefCallback<T> | MutableRefObject<T | null> | null,
  ...zs: (RefCallback<T> | MutableRefObject<T | null> | null | undefined)[]
): Ref<T> | undefined
export function joinRefs<T>(
  x?: RefCallback<T> | MutableRefObject<T | null> | null,
  y?: RefCallback<T> | MutableRefObject<T | null> | null,
  ...zs: (RefCallback<T> | MutableRefObject<T | null> | null | undefined)[]
): Ref<T> | undefined {
  const joined =
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
        }) || undefined
  return zs.length ? joinRefs(joined, ...zs) : joined
}

export function useJoinRefs() {
  return useMemo(() => memoizeOne(joinRefs), [])
}
