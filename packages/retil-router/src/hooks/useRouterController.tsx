import { useContext } from 'react'
import { HistoryState } from 'retil-history'

import { RouterControllerContext } from '../routerContext'
import { RouterController, RouterResponse } from '../routerTypes'

export function useRouterController<
  Ext = {},
  State extends HistoryState = HistoryState,
  Response extends RouterResponse = RouterResponse
>(): RouterController<Ext, State, Response> {
  return useContext(RouterControllerContext) as RouterController<
    Ext,
    State,
    Response
  >
}
