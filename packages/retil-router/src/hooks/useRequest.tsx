import { useContext } from 'react'
import { HistoryState } from 'retil-history'

import { RouterRequestContext } from '../routerContext'
import { RouterRequest } from '../routerTypes'

export function useRequest<
  State extends HistoryState = HistoryState
>(): RouterRequest<State> {
  return useContext(RouterRequestContext) as RouterRequest<State>
}
