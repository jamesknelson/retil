import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react'
import {
  joinEventHandlers,
  memoizeOne,
  useFirstInstanceOfLatestValue,
} from 'retil-support'
import { Connector } from './connector'

// ---

const keyboardDepthContext = createContext(1)

export const ProvideIncreasedKeyboardPriority: React.FunctionComponent = ({
  children,
}) => {
  const depth = useContext(keyboardDepthContext) + 1

  return (
    <keyboardDepthContext.Provider value={depth}>
      {children}
    </keyboardDepthContext.Provider>
  )
}

// ---

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

export interface KeyboardMergedProps<
  TElement extends SVGElement | HTMLElement,
> {
  onKeyDown?: (event: React.KeyboardEvent<TElement>) => void
}

export type KeyboardMergeableProps<TElement extends SVGElement | HTMLElement> =
  KeyboardMergedProps<TElement>

export type MergeKeyboardProps = <
  TElement extends SVGElement | HTMLElement,
  TMergeProps extends KeyboardMergeableProps<TElement> &
    Record<string, any> = {},
>(
  mergeProps?: TMergeProps &
    KeyboardMergeableProps<TElement> &
    Record<string, any>,
) => Omit<TMergeProps, keyof KeyboardMergeableProps<TElement>> &
  KeyboardMergedProps<TElement>

export interface KeyboardOptions {
  /**
   * If true, instead of applying a keyDown handler directly to the element,
   * it will instead add a global keyDown capture handler (i.e. one that is
   * called in the earlier capture phase at the top of the document).
   *
   * Context is used to ensure that elements deeper in the React tree will
   * still have their capture handlers called first, although all capture
   * handlers will be run before non-capture handlers.
   */
  capture?: boolean

  /**
   * Increase the priority of this element and its descdents' keyboard
   * handlers compared to other keyboard handlers at the same depths.
   *
   * Defaults to `1`
   */
  capturePriority?: number
}

export type KeyboardConnector = Connector<{}, MergeKeyboardProps>

export function useKeyboard<Event extends KeyboardEvent>(
  handler: null | KeyboardHandler<Event>,
  options: KeyboardOptions = {},
): KeyboardConnector {
  const depth = useContext(keyboardDepthContext)
  const { capture = false, capturePriority = 1 } = options

  useEffect(() => {
    if (capture && handler) {
      return captureDocumentKeyDown(handler, depth + capturePriority)
    }
  }, [capture, capturePriority, depth, handler])

  const joinKeyDownHandler = useMemo(() => memoizeOne(joinEventHandlers), [])

  const provideKeyboard = (children: React.ReactNode) => (
    <keyboardDepthContext.Provider value={depth + capturePriority}>
      {children}
    </keyboardDepthContext.Provider>
  )

  const mergeKeyboardProps: MergeKeyboardProps = (props = {} as any) =>
    capture
      ? props
      : {
          ...props,
          onKeyDown: joinKeyDownHandler(props?.onKeyDown, handler as any),
        }

  return [{}, mergeKeyboardProps, provideKeyboard]
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
