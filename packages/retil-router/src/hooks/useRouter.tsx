import { useMemo, useRef } from 'react'
import { FusorUse } from 'retil-source'

import { createRequestService } from '../requestService'
import {
  RouterFunction,
  RouterRequestService,
  RouterHistorySnapshot,
  RouterResponse,
  RouterRouteSnapshot,
  MountedRouterState,
  RouterSnapshotExtension,
} from '../routerTypes'
import { createRouter } from '../routerService'

import { useRouterService } from './useRouterService'

export interface UseRouterOptions<
  RouteExtension extends object = {},
  HistorySnapshot extends RouterHistorySnapshot = RouterHistorySnapshot
> {
  basename?: string
  extend?: (
    request: HistorySnapshot & RouterSnapshotExtension,
    use: FusorUse,
  ) => RouteExtension
  historyService?: RouterRequestService<HistorySnapshot>
  onResponseComplete?: (response: Response, request: RouteExtension) => void
  transitionTimeoutMs?: number
  unstable_isConcurrent?: boolean
}

export function useRouter<
  Request extends RouterRouteSnapshot = RouterRouteSnapshot,
  Response extends RouterResponse = RouterResponse
>(
  routerFunction: RouterFunction<Request, Response>,
  options: UseRouterOptions<Request, Response> = {},
): MountedRouterState<Request, Response> {
  const {
    requestService: requestServiceProp,
    initialSnapshot,
    onResponseComplete,
    transitionTimeoutMs = Infinity,
    unstable_isConcurrent,
  } = options

  const requestServiceRef = useRef<RouterRequestService<Request>>(
    requestServiceProp!,
  )
  if (requestServiceProp) {
    requestServiceRef.current = requestServiceProp
  }
  if (!requestServiceRef.current && typeof window !== 'undefined') {
    requestServiceRef.current = createRequestService() as RouterRequestService<Request>
  }
  if (!requestServiceRef.current) {
    throw new Error(
      `On the server, you must provide a history object to useRouter.`,
    )
  }

  const requestService = requestServiceRef.current
  const routerService = useMemo(
    () => createRouter(routerFunction, requestService, { initialSnapshot }),
    [requestService, routerFunction, initialSnapshot],
  )

  return useRouterService(routerService, {
    onResponseComplete,
    transitionTimeoutMs,
    unstable_isConcurrent,
  })
}
