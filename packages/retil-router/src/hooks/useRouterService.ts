import { useEffect, useMemo, useRef } from 'react'
import {
  MountedRouterState,
  RouterRouteSnapshot,
  RouterResponse,
  RouterService,
} from '../routerTypes'

import { useRouterSource } from './useRouterSource'

export interface UseRouterServiceOptions<
  Request extends RouterRouteSnapshot = RouterRouteSnapshot,
  Response extends RouterResponse = RouterResponse
> {
  /**
   * Called when a complete response object becomes available.
   */
  onResponseComplete?: (response: Response, request: Request) => void

  transitionTimeoutMs?: number

  unstable_isConcurrent?: boolean
}

export function useRouterService<
  Request extends RouterRouteSnapshot = RouterRouteSnapshot,
  Response extends RouterResponse = RouterResponse
>(
  routerService: RouterService<Request, Response>,
  options: UseRouterServiceOptions<Request, Response> = {},
): MountedRouterState<Request, Response> {
  const {
    onResponseComplete,
    transitionTimeoutMs,
    unstable_isConcurrent,
  } = options
  const [source, routerController] = routerService
  const [
    { content, request, response },
    pending,
    waitUntilNavigationCompletes,
  ] = useRouterSource(source, {
    transitionTimeoutMs,
    unstable_isConcurrent,
  })

  const onResponseCompleteRef = useRef(onResponseComplete)
  useEffect(() => {
    onResponseCompleteRef.current = onResponseComplete
  }, [onResponseComplete])

  useEffect(() => {
    waitUntilNavigationCompletes().then((snapshot) => {
      const handler = onResponseCompleteRef.current
      if (handler && snapshot.request === request) {
        handler(snapshot.response, snapshot.request)
      }
    })
  }, [request, response, waitUntilNavigationCompletes])

  return useMemo(
    () => ({
      ...routerController,
      content,
      navigate: (...args) =>
        routerController
          .navigate(...args)
          .then((navigated) =>
            navigated ? waitUntilNavigationCompletes().then(() => true) : false,
          ),
      pending,
      request,
      waitUntilNavigationCompletes,
    }),
    [content, routerController, pending, request, waitUntilNavigationCompletes],
  )
}
