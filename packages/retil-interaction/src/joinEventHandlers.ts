import React from 'react'

import { useMemo } from 'react'
import { memoizeOne } from 'retil-support'

export function useJoinEventHandlers() {
  return useMemo(() => memoizeOne(joinEventHandlers), [])
}

// Execute two event handlers in sequence, unless the first event handler
// prevents the default action, in which case the second handler will
// be abandoned.
export function joinEventHandlers<E extends React.SyntheticEvent>(
  x: React.EventHandler<E>,
  y?: React.EventHandler<E>,
): React.EventHandler<E>
export function joinEventHandlers<E extends React.SyntheticEvent>(
  x: React.EventHandler<E> | undefined,
  y: React.EventHandler<E>,
): React.EventHandler<E>
export function joinEventHandlers<E extends React.SyntheticEvent>(
  x?: React.EventHandler<E>,
  y?: React.EventHandler<E>,
): React.EventHandler<E> | undefined
export function joinEventHandlers<E extends React.SyntheticEvent>(
  x?: React.EventHandler<E>,
  y?: React.EventHandler<E>,
): React.EventHandler<E> | undefined {
  return !x || !y
    ? x || y
    : (event: E): void => {
        x(event)
        if (!event.defaultPrevented) {
          y(event)
        }
      }
}
