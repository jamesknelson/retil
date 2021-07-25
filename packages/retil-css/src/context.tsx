import React, { Context, createContext, useContext, useMemo } from 'react'

import { themeRiderSymbol } from './constants'
import { CSSRuntime, CSSTheme } from './types'

export const cssThemeContextContext = createContext<Context<CSSTheme>>({
  get Provider() {
    throw new Error(
      `retil-css isn't configured correctly. Did you add a top-level <CSSProvider>?`,
    )
  },
} as unknown as Context<CSSTheme>)

export interface CSSProviderProps {
  children: React.ReactNode
  runtime: CSSRuntime
  themeContext: React.Context<CSSTheme>
}

export function CSSProvider({
  children,
  runtime,
  themeContext,
}: CSSProviderProps) {
  const theme = useContext(themeContext)
  const extendedTheme = useMemo(
    () => ({
      ...theme,
      [themeRiderSymbol]: {
        selectorTypeContexts: [],
        runtime,
      },
    }),
    [theme, runtime],
  )

  return (
    <cssThemeContextContext.Provider value={themeContext}>
      <themeContext.Provider value={extendedTheme}>
        {children}
      </themeContext.Provider>
    </cssThemeContextContext.Provider>
  )
}

export function useCSSTheme(themeContextArg?: React.Context<CSSTheme>) {
  const defaultThemeContext = useContext(cssThemeContextContext)
  const themeContext = themeContextArg ?? defaultThemeContext
  const theme = useContext(themeContext)
  return theme[themeRiderSymbol]!
}
