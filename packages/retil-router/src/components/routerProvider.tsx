import * as React from 'react'

import {
  RouterContentContext,
  RouterControllerContext,
  RouterPendingContext,
  RouterRequestContext,
} from '../routerContext'
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
        <RouterPendingContext.Provider value={route.pending}>
          <RouterContentContext.Provider value={route.content}>
            {children}
          </RouterContentContext.Provider>
        </RouterPendingContext.Provider>
      </RouterRequestContext.Provider>
    </RouterControllerContext.Provider>
  )
}
