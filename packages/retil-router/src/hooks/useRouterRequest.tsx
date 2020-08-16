import { useContext } from 'react'

import { RouterRequestContext } from '../routerContext'
import { RouterHistoryState, RouterRequest } from '../routerTypes'

export function useRouterRequest<
  State extends RouterHistoryState = RouterHistoryState
>(): RouterRequest<State> {
  return useContext(RouterRequestContext) as RouterRequest<State>
}
