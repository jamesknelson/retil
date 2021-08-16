import memoizeOne from 'memoize-one'
import { EventHandler, SyntheticEvent, useMemo } from 'react'

// Execute two event handlers in sequence, unless the first event handler
// prevents the default action, in which case the second handler will
// be abandoned.
export function joinEventHandlers<E extends SyntheticEvent>(
  x: EventHandler<E>,
  y?: EventHandler<E>,
  ...zs: (EventHandler<E> | undefined)[]
): EventHandler<E>
export function joinEventHandlers<E extends SyntheticEvent>(
  x: EventHandler<E> | undefined,
  y: EventHandler<E>,
  ...zs: (EventHandler<E> | undefined)[]
): EventHandler<E>
export function joinEventHandlers<E extends SyntheticEvent>(
  x?: EventHandler<E>,
  y?: EventHandler<E>,
  ...zs: (EventHandler<E> | undefined)[]
): EventHandler<E> | undefined
export function joinEventHandlers<E extends SyntheticEvent>(
  x?: EventHandler<E>,
  y?: EventHandler<E>,
  ...zs: (EventHandler<E> | undefined)[]
): EventHandler<E> | undefined {
  const joined =
    !x || !y
      ? x || y
      : (event: E): void => {
          x(event)
          if (!event.defaultPrevented) {
            y(event)
          }
        }
  return zs.length ? joinEventHandlers(joined, ...zs) : joined
}

export function useJoinEventHandlers() {
  return useMemo(() => memoizeOne(joinEventHandlers), [])
}

export const useJoinedEventHandler: typeof joinEventHandlers = (
  x: any,
  y: any,
) => useMemo(() => joinEventHandlers(x, y), [x, y])
