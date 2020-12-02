import * as React from 'react'
import { createContext, useContext, useMemo } from 'react'
import {
  RouterFunction,
  RouterProvider,
  RouterRequestService,
  RouterSnapshot,
  UseRouterOptions,
  createRequestService,
  useRouter,
} from 'retil-router'
import { FusorUse } from 'retil-source'

import { NextilRequest, NextilResponse } from './nextilTypes'

export interface NextilRouterDefaultsContextValue {
  requestService: RouterRequestService<any>
  routerFunction: RouterFunction<any, any>
  initialSnapshot: RouterSnapshot<any, any>
}

export const NextilRouterDefaultsContext = createContext<NextilRouterDefaultsContextValue>(
  undefined as any,
)

export interface NextilRouterProps<Ext>
  extends Omit<
    UseRouterOptions<NextilRequest & Ext, NextilResponse>,
    'requestService'
  > {
  children: React.ReactNode

  fn?: RouterFunction<NextilRequest & Ext, NextilResponse>
  extendRequest?: (
    request: NextilRequest,
    use: FusorUse,
  ) => Partial<NextilRequest & Ext>
}

export function NextilRouter<Ext>(props: NextilRouterProps<Ext>) {
  const defaults = useContext(NextilRouterDefaultsContext)
  const appRequestService = defaults.requestService

  if (!defaults) {
    console.error(
      `NextilRouter could not locate the nextil context. Did you remember to wrap your App component with nextilApp()?`,
    )
  }

  const {
    children,
    extendRequest,
    fn: routerFunction = defaults.routerFunction,
    initialSnapshot = defaults.initialSnapshot,
    transitionTimeoutMs = Infinity,
    ...routerOptions
  } = props

  // Only re-use the request service when switching between retil routes.
  // Create a new request service for each new Next.js page.
  const requestService = useMemo(
    () =>
      createRequestService<Ext, NextilRequest & Ext>({
        extend: extendRequest as any,
        historyService: appRequestService,
      }),
    [extendRequest, appRequestService],
  )

  const router = useRouter(routerFunction, {
    requestService,
    initialSnapshot,
    transitionTimeoutMs,
    ...routerOptions,
  })

  return <RouterProvider value={router}>{children}</RouterProvider>
}
