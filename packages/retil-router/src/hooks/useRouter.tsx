import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Deferred } from 'retil-common'
import { HistoryService, HistoryState } from 'retil-history'

import {
  RouterSnapshot,
  RouterFunction,
  RouterController,
  RouterRequest,
  RouterResponse,
  Route,
} from '../routerTypes'
import { getNoopController, waitForMutablePromiseList } from '../routerUtils'

import { createRouter } from '../routerService'
import { useRouterSource } from './useRouterSource'

export interface UseRouterOptions<
  Ext = {},
  State extends HistoryState = HistoryState,
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
}

export function useRouter<
  Ext = {},
  State extends HistoryState = HistoryState,
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

  const [noopController] = useState(() =>
    getNoopController<Ext, State, Response>(),
  )

  const onResponseCompleteRef = useRef(onResponseComplete)
  onResponseCompleteRef.current = onResponseComplete

  const [
    routerSourceOrInitialSnapshot,
    routerController = noopController,
  ] = useMemo(
    () =>
      typeof routerFunctionOrInitialSnapshot === 'function'
        ? createRouter(routerFunctionOrInitialSnapshot, {
            basename,
            history,
            transformRequest,
          })
        : ([routerFunctionOrInitialSnapshot, undefined] as const),
    [basename, history, routerFunctionOrInitialSnapshot, transformRequest],
  )
  const [routerSnapshot, pending] = useRouterSource(
    routerSourceOrInitialSnapshot,
    {
      transitionTimeoutMs,
    },
  )
  const { content, request, response } = routerSnapshot

  const controllerActionDeferreds = useRef<Deferred<void>[]>([])
  const wrapHistoryAction = useCallback(
    <T, U extends any[]>(
      fn: (...args: U) => Promise<T>,
    ): ((...args: U) => Promise<T>) => {
      return (...args: U) => {
        const deferred = new Deferred<void>()
        controllerActionDeferreds.current.push(deferred)
        const result = fn(...args)
        // If the request has been cancelled by the user, manually resolve
        // the deferred.
        result
          .then((didLocationChange) => {
            if (!didLocationChange) {
              deferred.resolve()
            }
          })
          .catch(deferred.reject)
        return deferred.promise.then(() => result)
      }
    },
    [],
  )

  const controller = useMemo<RouterController<Ext, State, Response>>(
    () => ({
      back: wrapHistoryAction(routerController.back),
      block: routerController.block,
      prefetch: routerController.prefetch,
      navigate: wrapHistoryAction(routerController.navigate),
    }),
    [wrapHistoryAction, routerController],
  )

  // This effect will be called whenever the displayed route changes
  useEffect(() => {
    let hasUnmounted = false

    // Resolve any promises returned by controller methods
    const deferreds = controllerActionDeferreds.current.slice()
    controllerActionDeferreds.current = []
    for (const deferred of deferreds) {
      deferred.resolve()
    }

    // Wait for the response to complete before calling any event handlers.
    ;(async function handleResponse() {
      await waitForMutablePromiseList(response.pendingSuspenses)
      if (!hasUnmounted && (response.status || 200) < 300) {
        if (onResponseCompleteRef.current) {
          onResponseCompleteRef.current(response, request)
        }
      }
    })()

    return () => {
      hasUnmounted = true
    }
  }, [request, response])

  const route = useMemo(
    () => ({
      content,
      pending,
      request,
    }),
    [content, pending, request],
  )

  return [route, controller]
}
