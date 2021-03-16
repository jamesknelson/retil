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
  SyntheticEvent,
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
import { SurfaceDefaultsProvider } from './surfaceDefaultsContext'

export interface ControlContext {
  ref: React.RefCallback<ControlHandle | null>
  tabIndex: number
}

export interface ControlHandle {
  blur?: HTMLElement['blur']
  focus: HTMLElement['focus']
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

export const ControlProvider = forwardRef<ControlHandle, ControlProviderProps>(
  (props, ref) => {
    const { children, tabIndex } = props

    const handleRef = useRef<ControlHandle | null>(null)

    const setHandle = useCallback(
      (handle: ControlHandle | null) => {
        handleRef.current = handle

        if (typeof ref === 'function') {
          ref(handle)
        } else if (ref) {
          ref.current = handle
        }
      },
      [ref],
    )

    const delegateFocus = useCallback((event: SyntheticEvent) => {
      const handle = handleRef.current
      if (handle !== ((event.target as unknown) as ControlHandle)) {
        event.preventDefault()
        handle?.focus()
      }
    }, [])

    const context = useMemo(
      () => ({
        ref: setHandle,
        tabIndex: tabIndex || -1,
      }),
      [setHandle, tabIndex],
    )

    return (
      <ControlContext.Provider value={context}>
        <SurfaceDefaultsProvider delegateFocus={delegateFocus}>
          {children}
        </SurfaceDefaultsProvider>
      </ControlContext.Provider>
    )
  },
)

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
