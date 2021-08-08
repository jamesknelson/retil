import React, { useCallback, useMemo } from 'react'
import {
  joinEventHandlers,
  joinRefs,
  memoizeOne,
  useFirstInstanceOfLatestValue,
} from 'retil-support'

export type KeyMap = Record<
  string,
  React.KeyboardEventHandler | null | undefined
>

/**
 * Create a single keydown handler from a key map object, preventing default
 * and stopping propagation for any matched key.
 *
 * The key map object will be checked for equality between renders, such that
 * only the handlers need to be memoized, while the keymap object itself can be
 * recreated on each render without causing event handlers to be reattached.
 */
export function useKeyMapHandler<TElement extends Element>(
  unmemoizedKeyMap: KeyMap,
): React.KeyboardEventHandler<TElement> {
  const keyMap = useFirstInstanceOfLatestValue(unmemoizedKeyMap)
  const handler = useCallback(
    (event: React.KeyboardEvent<TElement>) => {
      const key = event.key
      const keyHandler = keyMap[key]
      if (keyHandler) {
        if (!event.defaultPrevented) {
          event.preventDefault()
          keyHandler(event)
        }
      }
    },
    [keyMap],
  )
  return handler
}

// ---

export interface KeyboardEvent {
  altKey: boolean
  code: string
  ctrlKey: boolean
  defaultPrevented: boolean
  key: string
  preventDefault: () => void
  metaKey: boolean
  repeat: boolean
  shiftKey: boolean
}

// https://stackoverflow.com/questions/52667959/what-is-the-purpose-of-bivariancehack-in-typescript-types
type EventHandler<E extends object> = {
  bivarianceHack(event: E): void
}['bivarianceHack']

export type KeyboardHandler<Event extends KeyboardEvent = KeyboardEvent> =
  EventHandler<Event>

export interface KeyboardMergedProps<TElement extends Element> {
  onKeyDown?: (event: React.KeyboardEvent<TElement>) => void
  ref?: React.Ref<TElement>
}

export type KeyboardMergeableProps<TElement extends Element> =
  KeyboardMergedProps<TElement>

export type MergeKeyboardProps = <
  TElement extends Element = Element,
  TMergeProps extends KeyboardMergeableProps<TElement> = {},
>(
  mergeProps?: TMergeProps &
    KeyboardMergeableProps<TElement> &
    Record<string, any>,
) => TMergeProps & KeyboardMergedProps<TElement>

export interface KeyboardOptions {
  capture?: boolean
}

/**
 * Returns a mergeProps function when focusable, will merge in an `onKeyDown`
 * event handler, and when selected but *not* focusable, will merge in a ref
 * that finds the elements depth within the DOM, before using that depth to
 * register a global capture keydown handler with the specified priority - where
 * deeper elements' handlers are executed first.
 */
export function useMergeKeyboardProps<Event extends KeyboardEvent>(
  handler: null | KeyboardHandler<Event>,
  options: KeyboardOptions = {},
): MergeKeyboardProps {
  const capture = options.capture ?? false
  const captureKeyboardRefCallback = useMemo(() => {
    if (capture && handler) {
      let stopCapturing: (() => void) | undefined
      return <TElement extends Element>(element: TElement | null) => {
        if (stopCapturing) {
          stopCapturing()
          stopCapturing = undefined
        }
        if (element) {
          const priority = getElementDepth(element)
          stopCapturing = captureDocumentKeyDown(handler, priority)
        }
      }
    }
  }, [capture, handler])

  const joinKeyDownHandler = useMemo(() => memoizeOne(joinEventHandlers), [])
  const joinRefCallback = useMemo(() => memoizeOne(joinRefs), [])

  return (props) =>
    capture
      ? {
          ...props!,
          ref: joinRefCallback(captureKeyboardRefCallback, props?.ref),
        }
      : {
          ...props!,
          onKeyDown: joinKeyDownHandler(props?.onKeyDown, handler as any),
        }
}

function getElementDepth(element: Element) {
  let depth = 0
  let node: Node | null | undefined = element
  while (node) {
    node = node.parentNode
    depth += 1
  }
  return depth
}

let captureDocumentKeyDownHandlers: (readonly [
  priority: number,
  handler: KeyboardHandler<any>,
])[]

function documentKeyDownHandler(
  this: unknown,
  event: globalThis.KeyboardEvent,
) {
  const handlers = captureDocumentKeyDownHandlers.slice(0)
  for (const [, handler] of handlers) {
    if (event.defaultPrevented) {
      return
    }
    handler(event)
  }
}

function captureDocumentKeyDown<Event extends KeyboardEvent>(
  keyDownHandler: KeyboardHandler<Event>,
  priority: number = 0,
): () => void {
  if (!captureDocumentKeyDownHandlers) {
    captureDocumentKeyDownHandlers = []
  }

  if (captureDocumentKeyDownHandlers.length === 0) {
    document.body.addEventListener('keydown', documentKeyDownHandler, true)
  }

  const tuple = [priority, keyDownHandler] as const
  captureDocumentKeyDownHandlers.push(tuple)
  captureDocumentKeyDownHandlers.sort(([x], [y]) => y - x)

  return () => {
    const index = captureDocumentKeyDownHandlers.indexOf(tuple)
    if (index >= 0) {
      captureDocumentKeyDownHandlers.splice(index, 1)
    }

    if (captureDocumentKeyDownHandlers.length === 0) {
      document.body.removeEventListener('keydown', documentKeyDownHandler, true)
    }
  }
}
