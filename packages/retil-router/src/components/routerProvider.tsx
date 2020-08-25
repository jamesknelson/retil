import * as React from 'react'

import { RouterControllerContext, RouterRequestContext } from '../routerContext'
import { RouterState } from '../routerTypes'

export interface RouterProviderProps {
  children: React.ReactNode
  value: RouterState
}

export function RouterProvider({ children, value }: RouterProviderProps) {
  return (
    <RouterControllerContext.Provider value={value.controller}>
      <RouterRequestContext.Provider value={value.request}>
        {children}
      </RouterRequestContext.Provider>
    </RouterControllerContext.Provider>
  )
}
