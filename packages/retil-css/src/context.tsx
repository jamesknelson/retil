import React, { createContext, useCallback, useMemo } from 'react'
import { areShallowEqual, identity, memoizeOne } from 'retil-support'

import { defaultMediaQueries } from './defaultMediaQueries'
import { ProvideDownSelector } from './downSelect'
import { CSSFunction } from './styleTypes'

export const cssFunctionContext = createContext<CSSFunction>(undefined as any)
export const themeContextContext = createContext<React.Context<any>>(
  undefined as any,
)

export interface StyleProviderProps {
  children: React.ReactNode
  cssFunction: CSSFunction
  mediaQueries?: Record<string, string>
  themeContext: React.Context<any>
}

export function StyleProvider({
  children,
  cssFunction,
  mediaQueries,
  themeContext,
}: StyleProviderProps) {
  return (
    <themeContextContext.Provider value={themeContext}>
      <cssFunctionContext.Provider value={cssFunction}>
        <ProvideMediaQueries value={mediaQueries}>
          {children}
        </ProvideMediaQueries>
      </cssFunctionContext.Provider>
    </themeContextContext.Provider>
  )
}
