import { useContext } from 'react'

import { RouterPendingContext } from '../routerContext'
import { RouterRequest } from '../routertypes'

export function useRouterPending<
  Request extends RouterRequest = RouterRequest
>(): Request | boolean {
  return useContext(RouterPendingContext) as Request
}
