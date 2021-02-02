import { useContext } from 'react'

import { RouterRequestContext } from '../routerContext'
import { RouterRequest } from '../routerTypes'

export function useRouterRequest<Request extends RouterRequest = RouterRequest>(
  forceRequest?: Request,
): Request {
  const contextRequest = useContext(RouterRequestContext) as Request
  return forceRequest || contextRequest
}
