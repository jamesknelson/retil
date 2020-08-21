import { useContext, useEffect, useRef, useState } from 'react'
import { HistoryService, getDefaultBrowserHistory } from 'retil-history'

import { UseRouterDefaultsContext } from '../routerContext'
import {
  RouterFunction,
  RouterHistoryState,
  RouterRequest,
  RouterResponse,
  RouterService,
  RouterState,
} from '../routerTypes'
import { createRouter } from '../routerService'

import { useRouterService } from './useRouterService'

export interface UseRouterOptions<
  RouterRequestExt = {},
  HistoryRequestExt = {},
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
    request: RouterRequest<State> & HistoryRequestExt & RouterRequestExt,
  ) => void

  transformRequest?: (
    request: RouterRequest<State> & HistoryRequestExt,
  ) => RouterRequest<State> & HistoryRequestExt & RouterRequestExt

  transitionTimeoutMs?: number

  unstable_isConcurrent?: boolean
}

const historyRouterCache = new WeakMap<
  HistoryService<any>,
  readonly [any[], RouterService<any, any, any> | RouterState<any, any>]
>()

export function useRouter<
  RouterRequestExt = {},
  HistoryRequestExt = {},
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

  const onResponseCompleteRef = useRef(onResponseComplete)
  onResponseCompleteRef.current = onResponseComplete

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
  const history = historyRef.current!

  // Can't use a useMemo or useRef for this as `createRouter()` may have side
  // effects, and can't use useEffect as we may need a router on the first
  // render, so instead we use a custom cache.
  const routerDeps = [basename, routerFunction, snapshotToUse, transformRequest]
  let cache = history && historyRouterCache.get(history)
  if (!cache || !cache[0].every((value, i) => value === routerDeps[i])) {
    cache = [
      routerDeps,
      snapshotToUse ||
        createRouter(routerFunction, history, {
          basename,
          transformRequest,
        }),
    ] as const
    if (!snapshotToUse) {
      historyRouterCache.set(history, cache)
    }
  }
  const routerServiceOrSnapshot = cache[1]

  useEffect(() => {
    if (initialState) {
      setSnapshotToUse(null)
    }
    // We only want this to be called on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return useRouterService(routerServiceOrSnapshot, {
    transitionTimeoutMs,
    unstable_isConcurrent,
  })
}
