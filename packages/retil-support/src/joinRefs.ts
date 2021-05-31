import type { MutableRefObject, Ref, RefCallback } from 'react'

export function joinRefs<T>(
  x: RefCallback<T>,
  y?: RefCallback<T> | MutableRefObject<T | null> | null,
): RefCallback<T>
export function joinRefs<T>(
  x: RefCallback<T> | MutableRefObject<T | null> | null | undefined,
  y: RefCallback<T>,
): RefCallback<T>
export function joinRefs<T>(
  x?: RefCallback<T> | MutableRefObject<T | null> | null,
  y?: RefCallback<T> | MutableRefObject<T | null> | null,
): Ref<T> | null
export function joinRefs<T>(
  x?: RefCallback<T> | MutableRefObject<T | null> | null,
  y?: RefCallback<T> | MutableRefObject<T | null> | null,
): Ref<T> | null {
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
