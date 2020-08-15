import { HistoryState } from 'retil-history'

import { RouterResponse, RouterSource, RouterSnapshot } from '../routerTypes'

export interface UseRouterSourceOptions {
  transitionTimeoutMs?: number
}

export interface UseRouterSourceFunction {
  <
    Ext = {},
    State extends HistoryState = HistoryState,
    Response extends RouterResponse = RouterResponse
  >(
    serviceOrInitialSnapshot:
      | RouterSource<Ext, State, Response>
      | RouterSnapshot<Ext, State, Response>,
    options?: UseRouterSourceOptions,
  ): readonly [RouterSnapshot<Ext, State, Response>, boolean]
}
