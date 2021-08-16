/**
 * A "control" is a group of interactive components, where exactly one of
 * those components is able to receive focus at a time.
 *
 * A control is free to move focus around *inside* of it, and to move the
 * tabIndex of any of its internal markup around.
 *
 * Custom control components need to:
 *
 * 1. Wrap the markup with <ControlProvider>
 * 2. Call the `connectControl()` function on the element that should receive
 *    focus events.
 */

import React, {
  ReactElement,
  ReactNode,
  cloneElement,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react'
import { joinRefs, noop } from 'retil-support'

import { useConnectRef } from './connectRef'
import { FocusableDefaultProvider, FocusableSnapshot } from './focusable'

export interface ControlContext {
  ref: React.Ref<FocusableSnapshot>
  tabIndex: number
}

export type ConnectControlFunction = (element: ReactElement) => ReactElement

// eslint-disable-next-line @typescript-eslint/no-redeclare
const ControlContext = createContext<ControlContext>({
  ref: noop,
  tabIndex: -1,
})

export interface ControlProviderProps {
  children: ReactNode
  tabIndex?: number
}

export const ControlProvider = forwardRef<
  FocusableSnapshot,
  ControlProviderProps
>((props, refProp) => {
  const { children, tabIndex = 0 } = props
  const focusableHandleRef = useRef<FocusableSnapshot | null>(null)
  const ref = useMemo(
    () => joinRefs(focusableHandleRef, refProp),
    [refProp, focusableHandleRef],
  )
  const context = useMemo(
    () => ({
      ref,
      tabIndex,
    }),
    [ref, tabIndex],
  )

  return (
    <ControlContext.Provider value={context}>
      <FocusableDefaultProvider value={focusableHandleRef}>
        {children}
      </FocusableDefaultProvider>
    </ControlContext.Provider>
  )
})

export function useControlContext(): ControlContext {
  return useContext(ControlContext)
}

export function useConnectControl(): ConnectControlFunction {
  const { ref, tabIndex } = useContext(ControlContext)
  const connectRef = useConnectRef(ref)

  return useCallback(
    (element) =>
      connectRef(
        cloneElement(element, {
          tabIndex: element.props.tabIndex || tabIndex,
        }),
      ),
    [connectRef, tabIndex],
  )
}
