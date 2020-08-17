import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Deferred } from 'retil-common'
import {
  RouterState,
  RouterController,
  RouterHistoryState,
  RouterRequest,
  RouterResponse,
  RouterService,
  RouterSnapshot,
} from '../routerTypes'
import { getNoopController, waitForMutablePromiseList } from '../routerUtils'

import { useRouterSource } from './useRouterSource'

export interface UseRouterServiceOptions<
  Ext = {},
  State extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
> {
  /**
   * Called when a complete response object becomes available.
   */
  onResponseComplete?: (
    response: Response,
    request: RouterRequest<State> & Ext,
  ) => void

  transitionTimeoutMs?: number

  unstable_isConcurrent?: boolean
}

export function useRouterService<
  Ext = {},
  State extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
>(
  routerServiceOrState:
    | RouterService<Ext, State, Response>
    | RouterState<Ext, State>,
  options: UseRouterServiceOptions<Ext, State, Response> = {},
): RouterState<Ext, State> {
  const {
    onResponseComplete,
    transitionTimeoutMs,
    unstable_isConcurrent,
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
      Array.isArray(routerServiceOrState)
        ? (routerServiceOrState as RouterService<Ext, State, Response>)
        : ([
            {
              ...routerServiceOrState,
              trigger: 'POP',
              response: ({
                head: [],
                headers: {},
                pendingSuspenses: [],
              } as any) as Response,
            } as RouterSnapshot<Ext, State, Response>,
            undefined,
          ] as const),
    [routerServiceOrState],
  )
  const [routerSnapshot, pending] = useRouterSource(
    routerSourceOrInitialSnapshot,
    {
      transitionTimeoutMs,
      unstable_isConcurrent,
    },
  )
  const { content, request, response } = routerSnapshot

  const controllerActionDeferreds = useRef<Deferred<void>[]>([])
  const wrapRouterAction = useCallback(
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
      back: wrapRouterAction(routerController.back),
      block: routerController.block,
      prefetch: routerController.prefetch,
      navigate: wrapRouterAction(routerController.navigate),
    }),
    [wrapRouterAction, routerController],
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

  const state = useMemo(
    () => ({
      content,
      controller,
      pending,
      request,
    }),
    [content, controller, pending, request],
  )

  return state
}
