import { useContext } from 'react'

import { RouterControllerContext } from '../routerContext'
import {
  RouterController,
  RouterHistoryState,
  RouterResponse,
} from '../routerTypes'

export function useRouterController<
  Ext = {},
  State extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
>(): RouterController<Ext, State, Response> {
  return useContext(RouterControllerContext) as RouterController<
    Ext,
    State,
    Response
  >
}
