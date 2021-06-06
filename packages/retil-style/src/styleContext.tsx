import React, { createContext, useCallback, useMemo } from 'react'
import { areShallowEqual, identity, memoizeOne } from 'retil-support'

import { defaultMediaQueries } from './defaultMediaQueries'
import { ProvideDownSelector } from './downSelect'
import { CSSFunction } from './styleTypes'

export const cssFunctionContext = createContext<CSSFunction>(undefined as any)

export interface StyleProviderProps {
  children: React.ReactNode
  cssFunction: CSSFunction
  mediaQueries?: Record<string, string>
}

export function StyleProvider({
  children,
  cssFunction,
  mediaQueries,
}: StyleProviderProps) {
  return (
    <cssFunctionContext.Provider value={cssFunction}>
      <ProvideMediaQueries value={mediaQueries}>{children}</ProvideMediaQueries>
    </cssFunctionContext.Provider>
  )
}

export interface ProvideMediaQueriesProps {
  children: React.ReactNode
  value?: Record<string, string>
}

export function ProvideMediaQueries(props: ProvideMediaQueriesProps) {
  const { children, value } = props
  const memoQueries = useMemo(
    () => memoizeOne(identity, (x, y) => areShallowEqual(x[0], y[0])),
    [],
  )
  const memoizedQueries = memoQueries(value || defaultMediaQueries)
  const downSelect = useCallback(
    (selectorName: string) => {
      const query = memoizedQueries[selectorName]
      return query && '@media ' + query
    },
    [memoizedQueries],
  )

  return (
    <ProvideDownSelector downSelect={downSelect}>
      {children}
    </ProvideDownSelector>
  )
}
