/**
 * A "control" is a group of interactive components, where exactly one of
 * those components is able to receive focus at a time.
 *
 * A control is free to move focus around *inside* of it, and to move the
 * tabIndex of any of its internal markup around.
 *
 * Custom control components eed to:
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
import { noop } from 'retil-support'

import { useConnectRef } from './connectRef'
import { FocusDelegationProvider, FocusableElement } from './focusable'

export interface ControlContext {
  ref: React.RefCallback<FocusableElement | null>
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
  FocusableElement,
  ControlProviderProps
>((props, ref) => {
  const { children, tabIndex } = props

  const handleRef = useRef<FocusableElement | null>(null)

  const setHandle = useCallback(
    (handle: FocusableElement | null) => {
      handleRef.current = handle

      if (typeof ref === 'function') {
        ref(handle)
      } else if (ref) {
        ref.current = handle
      }
    },
    [ref],
  )

  const context = useMemo(
    () => ({
      ref: setHandle,
      tabIndex: tabIndex || -1,
    }),
    [setHandle, tabIndex],
  )

  return (
    <ControlContext.Provider value={context}>
      <FocusDelegationProvider target={handleRef}>
        {children}
      </FocusDelegationProvider>
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
