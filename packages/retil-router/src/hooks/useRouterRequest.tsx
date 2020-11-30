import { useContext } from 'react'

import { RouterRequestContext } from '../routerContext'
import { RouterRequest } from '../routerTypes'

export function useRouterRequest<
  Request extends RouterRequest = RouterRequest
>(): Request {
  return useContext(RouterRequestContext) as Request
}
