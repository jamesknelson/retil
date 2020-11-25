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
  TransformRequestFunction,
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

  transformRequest?: TransformRequestFunction<
    RouterRequestExt,
    HistoryRequestExt
  >

  transitionTimeoutMs?: number

  unstable_isConcurrent?: boolean
}

const historyMemo = createWeakMemo<HistoryService<any, any>>()
const routerMemo = createWeakMemo<RouterService<any, any, any>>()

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
    transformRequest,
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

  const history = historyMemo(
    () =>
      historyRef.current &&
      ([
        onlyNotifyLatestSubscriber(historyRef.current![0]),
        historyRef.current![1],
      ] as any),
    [historyRef.current! || {}],
  )

  const routerServiceOrSnapshot =
    snapshotToUse ||
    routerMemo(
      () =>
        createRouter(routerFunction, history, {
          basename,
          transformRequest,
        }),
      [history],
      [basename, routerFunction, transformRequest],
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
