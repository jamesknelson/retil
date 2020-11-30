import * as React from 'react'

import { UseRouterOptions, useRouter } from '../hooks/useRouter'
import { RouterFunction, RouterRequest, RouterResponse } from '../routerTypes'

import { RouterProvider } from './routerProvider'

export interface RouterProps<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
> extends UseRouterOptions<Request, Response> {
  children: React.ReactNode
  fn: RouterFunction<Request, Response>
}

export function Router<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
>(props: RouterProps<Request, Response>) {
  const { children, fn, ...routerOptions } = props
  const router = useRouter(fn, routerOptions)
  return <RouterProvider value={router}>{children}</RouterProvider>
}
