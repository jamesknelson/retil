import {
  RouterHistoryState,
  RouterResponse,
  RouterSource,
  RouterSnapshot,
} from '../routerTypes'

export interface UseRouterSourceOptions {
  transitionTimeoutMs?: number
  unstable_isConcurrent?: boolean
}

export interface UseRouterSourceFunction {
  <
    Ext = {},
    State extends RouterHistoryState = RouterHistoryState,
    Response extends RouterResponse = RouterResponse
  >(
    serviceOrSnapshot:
      | RouterSource<Ext, State, Response>
      | RouterSnapshot<Ext, State, Response>,
    options?: UseRouterSourceOptions,
  ): readonly [RouterSnapshot<Ext, State, Response>, boolean]
}
