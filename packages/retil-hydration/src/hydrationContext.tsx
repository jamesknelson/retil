import React, { ReactNode, createContext, useContext } from 'react'
import { useBoundaryEffect } from 'retil-boundary'
import { useEnv } from 'retil-mount'

import { getDefaultHydrationEnvService } from './hydrationEnvService'
import { HydrationEnv } from './hydrationTypes'

const OnHydrationDetectedContext = createContext<null | (() => void)>(null)
const HydratingContext = createContext<undefined | boolean>(undefined)

export interface HydrationProviderProps {
  children: ReactNode
  isHydrating?: boolean
  onHydrationDetected: () => void
}

/**
 * An optional provider that allows for manual control of the hydration state.
 *
 * When not provided, the hydration hooks will instead create and interact with
 * a default global hydration service.
 */
export const HydrationProvider = (props: HydrationProviderProps) => {
  const { children, onHydrationDetected, isHydrating } = props

  return (
    <HydratingContext.Provider value={isHydrating}>
      <OnHydrationDetectedContext.Provider value={onHydrationDetected}>
        {children}
      </OnHydrationDetectedContext.Provider>
    </HydratingContext.Provider>
  )
}

/**
 * Sets up retil-boundary based hydration detection for your app.
 *
 * This should be called once at the top level of your app, above any
 * <Boundary> components. It'll then caue `useIsHydrating()` to become `false`
 * after the first render of the deepest <Boundary> component.
 */
export function useBoundaryHydrater() {
  const markAsHydrated = useMarkAsHydrated()
  useBoundaryEffect(markAsHydrated)
}

/**
 * Returns a function that can be called to manually mark the app as hydrated.
 *
 * When used in conjunction with a `<HydrationProvider>`, this will call the
 * provided `onHydrationDetected` function. Otherwise, it'll call the default
 * hydration service's `hydrate` method.
 */
export function useMarkAsHydrated() {
  const contextOnHydrationDetected = useContext(OnHydrationDetectedContext)
  return contextOnHydrationDetected || getDefaultHydrationEnvService()[1]
}

export function useIsHydrating() {
  const env = useEnv<HydrationEnv>()
  const contextHydrating = useContext(HydratingContext)
  return contextHydrating ?? env.hydrating
}

export function useHasHydrated() {
  return useIsHydrating() === false
}
