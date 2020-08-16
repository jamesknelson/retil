import { useMemo, useRef } from 'react'
import { HistoryService } from 'retil-history'

import {
  RouterController,
  RouterFunction,
  RouterHistoryState,
  RouterRequest,
  RouterResponse,
  RouterSnapshot,
  Route,
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
  routerFunctionOrInitialSnapshot:
    | RouterFunction<RouterRequest<State> & Ext, Response>
    | RouterSnapshot<Ext, State, Response>,
  options: UseRouterOptions<Ext, State, Response> = {},
): readonly [Route<Ext, State>, RouterController<Ext, State, Response>] {
  const {
    basename,
    history,
    onResponseComplete,
    transformRequest,
    transitionTimeoutMs,
  } = options

  const onResponseCompleteRef = useRef(onResponseComplete)
  onResponseCompleteRef.current = onResponseComplete

  const routerServiceOrInitialSnapshot = useMemo(
    () =>
      typeof routerFunctionOrInitialSnapshot === 'function'
        ? createRouter(routerFunctionOrInitialSnapshot, {
            basename,
            history,
            transformRequest,
          })
        : routerFunctionOrInitialSnapshot,
    [basename, history, routerFunctionOrInitialSnapshot, transformRequest],
  )
  return useRouterService(routerServiceOrInitialSnapshot, {
    transitionTimeoutMs,
  })
}
