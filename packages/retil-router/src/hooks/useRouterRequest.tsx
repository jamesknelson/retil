import { useContext } from 'react'

import { RouterRequestContext } from '../routerContext'
import { RouterRouteSnapshot } from '../routerTypes'

export function useRouterRequest<
  Request extends RouterRouteSnapshot = RouterRouteSnapshot
>(forceRequest?: Request): Request {
  const contextRequest = useContext(RouterRequestContext) as Request
  return forceRequest || contextRequest
}
