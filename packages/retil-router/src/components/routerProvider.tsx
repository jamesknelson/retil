import * as React from 'react'

import { RouterControllerContext, RouterRequestContext } from '../routerContext'
import { RouterState } from '../routerTypes'

export interface RouterProviderProps {
  children: React.ReactNode
  state: RouterState
}

export function RouterProvider({
  children,
  state: router,
}: RouterProviderProps) {
  return (
    <RouterControllerContext.Provider value={router.controller}>
      <RouterRequestContext.Provider value={router.request}>
        {children}
      </RouterRequestContext.Provider>
    </RouterControllerContext.Provider>
  )
}
