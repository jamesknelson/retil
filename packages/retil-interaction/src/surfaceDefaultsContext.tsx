import React, { SyntheticEvent, createContext, useMemo } from 'react'

export interface TSurfaceDefaultsContext {
  delegateFocus?: (event: SyntheticEvent) => void
}

export const SurfaceDefaultsContext = createContext<TSurfaceDefaultsContext>({})

export interface SurfaceDefaultsProviderProps extends TSurfaceDefaultsContext {
  children: React.ReactNode
}

export function SurfaceDefaultsProvider(props: SurfaceDefaultsProviderProps) {
  const { children, delegateFocus } = props

  const context = useMemo(
    () => ({
      delegateFocus,
    }),
    [delegateFocus],
  )

  return useMemo(
    () => (
      <SurfaceDefaultsContext.Provider value={context}>
        {children}
      </SurfaceDefaultsContext.Provider>
    ),
    [context, children],
  )
}
