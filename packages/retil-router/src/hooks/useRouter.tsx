import { useContext, useEffect, useRef, useState } from 'react'
import { onlyNotifyLatestSubscriber } from 'retil-source'
import { createWeakMemo } from 'retil-support'
import { HistoryService, getDefaultBrowserHistory } from 'retil-history'

import { UseRouterDefaultsContext } from '../routerContext'
import {
  RouterFunction,
  RouterHistoryState,
  RouterRequest,
  RouterResponse,
  RouterService,
  RouterState,
  RouterRequestExtender,
} from '../routerTypes'
import { createRouter } from '../routerService'

import { useRouterService } from './useRouterService'

export interface UseRouterOptions<
  RouterRequestExt extends object = {},
  HistoryRequestExt extends object = {},
  State extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
> {
  basename?: string

  history?: HistoryService<HistoryRequestExt, State>

  initialState?: RouterState<HistoryRequestExt & RouterRequestExt, State>

  /**
   * Called when a complete response object becomes available.
   */
  onResponseComplete?: (
    response: Response,
    request: RouterRequest<any> & HistoryRequestExt & RouterRequestExt,
  ) => void

  extendRequest?: RouterRequestExtender<RouterRequestExt, HistoryRequestExt>

  transitionTimeoutMs?: number

  unstable_isConcurrent?: boolean
}

const historyWeakMemo = createWeakMemo<HistoryService<any, any>>()
const routerWeakMemo = createWeakMemo<RouterService<any, any, any>>()

export function useRouter<
  RouterRequestExt extends object = {},
  HistoryRequestExt extends object = {},
  State extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
>(
  routerFunction: RouterFunction<
    RouterRequest<State> & HistoryRequestExt & RouterRequestExt,
    Response
  >,
  options: UseRouterOptions<
    RouterRequestExt,
    HistoryRequestExt,
    State,
    Response
  > = {},
): RouterState<HistoryRequestExt & RouterRequestExt, State> {
  const defaults = useContext(UseRouterDefaultsContext)
  const {
    basename,
    history: historyProp = defaults.history as HistoryService<
      HistoryRequestExt,
      State
    >,
    initialState = defaults.initialState,
    onResponseComplete,
    extendRequest,
    transitionTimeoutMs = defaults.transitionTimeoutMs,
    unstable_isConcurrent,
  } = options

  const [snapshotToUse, setSnapshotToUse] = useState(initialState || null)

  const historyRef = useRef<HistoryService<HistoryRequestExt, State> | null>(
    null,
  )
  if (historyProp) {
    historyRef.current = historyProp
  }
  if (!historyRef.current && !snapshotToUse) {
    historyRef.current = getDefaultBrowserHistory() as HistoryService<
      HistoryRequestExt,
      State
    >
  }

  const history = historyWeakMemo(
    () =>
      historyRef.current &&
      ([
        // When a new router is created due to an update to basename,
        // routerFunction or transformRequest, the previous router will stay
        // subscribed for a brief period -- and we don't want to notify it
        // of any redirects caused by the new router (in case it causes a
        // redirect loop).
        onlyNotifyLatestSubscriber(historyRef.current![0]),
        historyRef.current![1],
      ] as any),
    [historyRef.current! || {}],
  )

  const routerServiceOrSnapshot =
    snapshotToUse ||
    routerWeakMemo(
      () =>
        createRouter(routerFunction, history, {
          basename,
          extendRequest,
        }),
      [history],
      [basename, routerFunction, extendRequest],
    )

  useEffect(() => {
    if (initialState) {
      setSnapshotToUse(null)
    }
    // We only want this to be called on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return useRouterService(routerServiceOrSnapshot, {
    onResponseComplete,
    transitionTimeoutMs,
    unstable_isConcurrent,
  })
}
