import { useContext } from 'react'

import { RouterRequestContext } from '../routerContext'
import { RouterHistoryState, RouterRequest } from '../routerTypes'

export function useRequest<
  Ext = {},
  State extends RouterHistoryState = RouterHistoryState
>(): RouterRequest<State> & Ext {
  return useContext(RouterRequestContext) as RouterRequest<State> & Ext
}
