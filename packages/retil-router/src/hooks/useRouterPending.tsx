import { useContext } from 'react'

import { RouterPendingContext } from '../routerContext'

export function useRouterPending(): boolean {
  return useContext(RouterPendingContext)
}
