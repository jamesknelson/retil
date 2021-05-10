import * as React from 'react'

import { UseRouterOptions, useRouter } from '../hooks/useRouter'
import {
  RouterFunction,
  RouterRouteSnapshot,
  RouterResponse,
} from '../routerTypes'

import { RouterProvider } from './routerProvider'

export interface RouterProps<
  Request extends RouterRouteSnapshot = RouterRouteSnapshot,
  Response extends RouterResponse = RouterResponse
> extends UseRouterOptions<Request, Response> {
  children: React.ReactNode
  fn: RouterFunction<Request, Response>
}

export function Router<
  Request extends RouterRouteSnapshot = RouterRouteSnapshot,
  Response extends RouterResponse = RouterResponse
>(props: RouterProps<Request, Response>) {
  const { children, fn, ...routerOptions } = props
  const router = useRouter(fn, routerOptions)
  return <RouterProvider value={router}>{children}</RouterProvider>
}
