import type { EventHandler, SyntheticEvent } from 'react'

// Execute two event handlers in sequence, unless the first event handler
// prevents the default action, in which case the second handler will
// be abandoned.
export function joinEventHandlers<E extends SyntheticEvent>(
  x: EventHandler<E>,
  y?: EventHandler<E>,
): EventHandler<E>
export function joinEventHandlers<E extends SyntheticEvent>(
  x: EventHandler<E> | undefined,
  y: EventHandler<E>,
): EventHandler<E>
export function joinEventHandlers<E extends SyntheticEvent>(
  x?: EventHandler<E>,
  y?: EventHandler<E>,
): EventHandler<E> | undefined
export function joinEventHandlers<E extends SyntheticEvent>(
  x?: EventHandler<E>,
  y?: EventHandler<E>,
): EventHandler<E> | undefined {
  return !x || !y
    ? x || y
    : (event: E): void => {
        x(event)
        if (!event.defaultPrevented) {
          y(event)
        }
      }
}
