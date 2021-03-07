import React, {
  SyntheticEvent,
  createContext,
  useCallback,
  useContext,
  useRef,
} from 'react'
import { noop } from 'retil-support'

import { SurfaceDefaultsProvider } from './surfaceDefaultsContext'

export type Focusable = Pick<HTMLElement, 'focus'>

const ControlContext = createContext<React.RefCallback<Focusable | null>>(noop)

export interface ControlProviderProps {
  children: React.ReactNode
}

export function ControlProvider(props: ControlProviderProps) {
  const focusTargetRef = useRef<Focusable | null>(null)

  const setFocusTarget = useCallback((element: Focusable | null) => {
    focusTargetRef.current = element
  }, [])

  const delegateFocus = useCallback((event: SyntheticEvent) => {
    const target = focusTargetRef.current
    if (target !== ((event.target as unknown) as Focusable)) {
      event.preventDefault()
      target?.focus()
    }
  }, [])

  return (
    <ControlContext.Provider value={setFocusTarget}>
      <SurfaceDefaultsProvider delegateFocus={delegateFocus}>
        {props.children}
      </SurfaceDefaultsProvider>
    </ControlContext.Provider>
  )
}

/**
 * Returns a ref which should be passed to the element within the control
 * which actually receives focus when any of its surfaces are clicked.
 */
export function useControlFocusTargetRef(): React.RefCallback<Focusable | null> {
  return useContext(ControlContext)
}
