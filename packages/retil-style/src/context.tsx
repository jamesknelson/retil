import React, { Context, createContext, useContext, useMemo } from 'react'

import type { CSSRuntimeFunction, CSSTheme } from './cssTypes'

export const retilCSSInterpolationContextSymbol = Symbol.for('retil-css')

export const retilCSSReactContext = createContext<Context<CSSTheme>>({
  get Provider() {
    throw new Error(
      `retil-css isn't configured correctly. Did you add a top-level <CSSProvider>?`,
    )
  },
} as unknown as Context<CSSTheme>)

export interface RetilCSSInterpolationContext {
  customSelectors: unknown[]
  runtime: CSSRuntimeFunction
}

export interface ProviderProps {
  children: React.ReactNode
  cssRuntime: CSSRuntimeFunction
  themeContext: React.Context<CSSTheme>
}

export function StyleProvider({
  children,
  cssRuntime,
  themeContext,
}: ProviderProps) {
  const theme = useContext(themeContext)
  const extendedTheme = useMemo(
    () => ({
      ...theme,
      [retilCSSInterpolationContextSymbol]: {
        customSelectors: [],
        runtime: cssRuntime,
      },
    }),
    [theme, cssRuntime],
  )

  return (
    <retilCSSReactContext.Provider value={themeContext}>
      <themeContext.Provider value={extendedTheme}>
        {children}
      </themeContext.Provider>
    </retilCSSReactContext.Provider>
  )
}

export function useCSSContext(themeContextArg?: React.Context<CSSTheme>) {
  const defaultThemeContext = useContext(retilCSSReactContext)
  const themeContext = themeContextArg ?? defaultThemeContext
  const theme = useContext(themeContext)
  return theme[retilCSSInterpolationContextSymbol]!
}
