import { useContext } from 'react'

import { RouterControllerContext } from '../routerContext'
import { RouterController, RouterHistoryState } from '../routerTypes'

export function useRouterController<
  Ext = {},
  State extends RouterHistoryState = RouterHistoryState
>(): RouterController<Ext, State> {
  return useContext(RouterControllerContext) as RouterController<Ext, State>
}
