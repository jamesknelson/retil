import React, { ReactNode, createContext, useContext } from 'react'
import { useBoundaryEffect } from 'retil-boundary'
import { useEnv } from 'retil-mount'

import { getDefaultHydrationEnvService } from './hydrationEnvService'
import { HydrationEnv } from './hydrationTypes'

const OnHydrationDetectedContext = createContext<null | (() => void)>(null)
const HydratingContext = createContext<undefined | boolean>(undefined)

export interface HydrationProviderProps {
  children: ReactNode
  env?: HydrationEnv
  onHydrationDetected?: () => void
}

export const HydrationProvider = (props: HydrationProviderProps) => {
  const { children, onHydrationDetected = null, env = null } = props

  return (
    <HydratingContext.Provider value={env?.hydrating || undefined}>
      <OnHydrationDetectedContext.Provider value={onHydrationDetected}>
        {children}
      </OnHydrationDetectedContext.Provider>
    </HydratingContext.Provider>
  )
}

export function useMarkAsHydrated() {
  const contextOnHydrationDetected = useContext(OnHydrationDetectedContext)
  return contextOnHydrationDetected || getDefaultHydrationEnvService()[1]
}

export function useHydrater() {
  const markAsHydrated = useMarkAsHydrated()
  useBoundaryEffect(() => {
    markAsHydrated()
  })
}

export function useIsHydrating() {
  const env = useEnv<HydrationEnv>()
  const contextHydrating = useContext(HydratingContext)
  return contextHydrating ?? env.hydrating
}

export function useHasHydrated() {
  return useIsHydrating() === false
}
