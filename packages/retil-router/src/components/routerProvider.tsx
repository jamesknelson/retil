import * as React from 'react'

import { RouterControllerContext, RouterRequestContext } from '../routerContext'
import { RouterController, Route } from '../routerTypes'

export interface RouterProviderProps {
  children: React.ReactNode
  controller: RouterController
  route: Route
}

export function RouterProvider({
  children,
  controller,
  route,
}: RouterProviderProps) {
  return (
    <RouterControllerContext.Provider value={controller}>
      <RouterRequestContext.Provider value={route.request}>
        {children}
      </RouterRequestContext.Provider>
    </RouterControllerContext.Provider>
  )
}
