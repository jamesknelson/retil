import { useContext } from 'react'

import { RouterPendingContext } from '../routerContext'
import { RouterRouteSnapshot } from '../routerTypes'

export function useRouterPending<
  Request extends RouterRouteSnapshot = RouterRouteSnapshot
>(): Request | boolean {
  return useContext(RouterPendingContext) as Request
}
