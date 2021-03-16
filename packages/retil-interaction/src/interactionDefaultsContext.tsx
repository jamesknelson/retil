import React, { createContext, useContext, useMemo } from 'react'

export interface TInteractionDefaultsContext {
  disabled?: boolean
  focusable?: boolean
}

export const InteractionDefaultsContext = createContext<TInteractionDefaultsContext>(
  {
    disabled: false,
    focusable: true,
  },
)

export interface InteractionDefaultsProviderProps
  extends TInteractionDefaultsContext {
  children: React.ReactNode
}

export function InteractionDefaultsProvider(
  props: InteractionDefaultsProviderProps,
) {
  const parentContext = useContext(InteractionDefaultsContext)
  const {
    children,
    disabled = parentContext.disabled,
    focusable = parentContext.focusable,
  } = props

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
