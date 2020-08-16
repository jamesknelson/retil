import { useEffect, useMemo, useRef, useState } from 'react'
import { HistoryService, getDefaultBrowserHistory } from 'retil-history'

import {
  RouterFunction,
  RouterHistoryState,
  RouterRequest,
  RouterResponse,
  RouterState,
} from '../routerTypes'

import { createRouter } from '../routerService'
import { useRouterService } from './useRouterService'

export interface UseRouterOptions<
  Ext = {},
  State extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
> {
  basename?: string

  history?: HistoryService<State>

  initialState?: RouterState<Ext, State>

  /**
   * Called when a complete response object becomes available.
   */
  onResponseComplete?: (
    response: Response,
    request: RouterRequest<State> & Ext,
  ) => void

  transformRequest?: (
    request: RouterRequest<State>,
  ) => RouterRequest<State> & Ext

  transitionTimeoutMs?: number

  unstable_isConcurrent?: boolean
}

export function useRouter<
  Ext = {},
  State extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
>(
  routerFunction: RouterFunction<RouterRequest<State> & Ext, Response>,
  options: UseRouterOptions<Ext, State, Response> = {},
): RouterState<Ext, State> {
  const {
    basename,
    history,
    initialState,
    onResponseComplete,
    transformRequest,
    transitionTimeoutMs,
    unstable_isConcurrent,
  } = options

  const onResponseCompleteRef = useRef(onResponseComplete)
  onResponseCompleteRef.current = onResponseComplete

  const [snapshotToUse, setSnapshotToUse] = useState(initialState || null)

  const historyRef = useRef<HistoryService<State> | null>(history || null)
  if (!historyRef.current && !snapshotToUse) {
    historyRef.current = getDefaultBrowserHistory() as HistoryService<State>
  }

  const routerServiceOrSnapshot = useMemo(
    () =>
      snapshotToUse ||
      createRouter(routerFunction, historyRef.current!, {
        basename,
        transformRequest,
      }),
    [basename, routerFunction, snapshotToUse, transformRequest],
  )

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
