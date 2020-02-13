import React, { createContext, useMemo } from 'react'

import { CacheModel } from './resource'
import { Store } from './store'

export const RetilContext = createContext<{
  context?: any
  resourceCacheModel?: CacheModel<any>
  store?: Store
}>({})

interface RetilProviderProps<Context extends object = any> {
  children: React.ReactNode
  context?: Context
  resourceCacheModel?: CacheModel<Context>
  store?: Store
}

export function Provider<Context extends object = any>({
  children,
  resourceCacheModel,
  context,
  store,
}: RetilProviderProps<Context>) {
  // TODO: memoize on context shallow comparison

  const value = useMemo(
    () => ({
      resourceCacheModel,
      context,
      store,
    }),
    [resourceCacheModel, context, store],
  )

  return <RetilContext.Provider value={value}>{children}</RetilContext.Provider>
}
