import { useContext } from 'react'
import { HistoryState } from 'retil-history'

import { RouterPendingContext } from '../routerContext'

export function useIsRouterPending<
  State extends HistoryState = HistoryState
>(): boolean {
  return useContext(RouterPendingContext)
}
