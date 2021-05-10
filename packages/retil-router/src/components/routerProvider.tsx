import * as React from 'react'
import { useMemo } from 'react'

import {
  RouterContentContext,
  RouterControllerContext,
  RouterPendingContext,
  RouterRequestContext,
} from '../routerContext'
import { MountedRouterState } from '../routerTypes'

export interface RouterProviderProps {
  children: React.ReactNode

  // Pending is optional, as passing pending will cause changes to context that
  // may be undesirable in some applications.
  value: Omit<MountedRouterState, 'pending'> & {
    pending?: MountedRouterState['pending']
  }
}

export function RouterProvider({ children, value }: RouterProviderProps) {
  const { block, navigate, precache, waitUntilNavigationCompletes } = value

  const controller = useMemo(
    () => ({
      block,
      navigate,
      precache,
      waitUntilNavigationCompletes,
    }),
    [block, navigate, precache, waitUntilNavigationCompletes],
  )

  return (
    <RouterControllerContext.Provider value={controller}>
      <RouterRequestContext.Provider value={value.request}>
        <RouterContentContext.Provider value={value.content}>
          <RouterPendingContext.Provider value={value.pending}>
            {children}
          </RouterPendingContext.Provider>
        </RouterContentContext.Provider>
      </RouterRequestContext.Provider>
    </RouterControllerContext.Provider>
  )
}
