import React, { createContext, useMemo } from 'react'

export interface TInteractionDefaultsContext {
  disabled?: boolean
  focusable?: boolean
}

export const InteractionDefaultsContext = createContext<TInteractionDefaultsContext>(
  {},
)

export interface InteractionDefaultsProviderProps
  extends TInteractionDefaultsContext {
  children: React.ReactNode
}

export function InteractionDefaultsProvider(
  props: InteractionDefaultsProviderProps,
) {
  const { children, disabled, focusable } = props

  const context = useMemo(
    () => ({
      disabled,
      focusable,
    }),
    [disabled, focusable],
  )

  return useMemo(
    () => (
      <InteractionDefaultsContext.Provider value={context}>
        {children}
      </InteractionDefaultsContext.Provider>
    ),
    [context, children],
  )
}
