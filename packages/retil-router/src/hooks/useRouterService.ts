import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Deferred } from 'retil-support'
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

  const [noopController] = useState(() => getNoopController<Ext, State>())

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
  const wrapNavigationAction = useCallback(
    <U extends any[]>(
      fn: (...args: U) => Promise<boolean> | void,
    ): ((...args: U) => Promise<boolean>) => {
      return (...args: U) => {
        const deferred = new Deferred<void>()
        controllerActionDeferreds.current.push(deferred)
        const result = fn(...args) || Promise.resolve(true)
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

  // TODO:
  // - there's an issue here where waitUntilStable only waits until the current
  //   router is stable. if the current router changes, it'll resolve before
  //   the route is actually stable.
  // - we need to create separate routers for separate configs; we unfortunately
  //   can't store configs in non-react state, as modern React doesn't allow us
  //   to assume that the last rendered props are the currently desired props,
  //   and we don't want to use effects to trigger updates to router config as
  //   it'll require a full render/commit between changing the config, and
  //   rendering an updated route.
  // - => we need to create our own waitUntilStable function and patch it in,
  //      so that if we're in the middle of a render, it waits until an effect,
  //      and *then* delegates to the latest router's waitUntilStable (and
  //      checks that no subsequent renders have occurred after that completes).

  const waitUntilStable = useCallback(async (routerController: any) => {
    await routerController.waitUntilStable()
    if (routerController !== latestRouterControllerRef.current) {
      await waitUntilStable(latestRouterControllerRef.current)
    }
  }, [])

  const controller = useMemo<RouterController<Ext, State>>(
    () => ({
      back: wrapNavigationAction(routerController.back),
      block: routerController.block,
      prefetch: routerController.prefetch,
      navigate: wrapNavigationAction(routerController.navigate),
      forceNavigate: wrapNavigationAction(routerController.forceNavigate),
      waitUntilStable: () => waitUntilStable(routerController),
    }),
    [routerController, wrapNavigationAction, waitUntilStable],
  )

  const latestRouterControllerRef = useRef(routerController)
  useEffect(() => {
    latestRouterControllerRef.current = routerController
  }, [routerController])

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
