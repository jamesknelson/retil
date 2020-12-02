import { useMemo, useRef } from 'react'

import { createRequestService } from '../requestService'
import {
  RouterFunction,
  RouterRequest,
  RouterRequestService,
  RouterResponse,
  RouterSnapshot,
  RouterState,
} from '../routerTypes'
import { createRouter } from '../routerService'

import { useRouterService } from './useRouterService'

export interface UseRouterOptions<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
> {
  initialSnapshot?: RouterSnapshot<Request, Response>
  onResponseComplete?: (response: Response, request: Request) => void
  requestService?: RouterRequestService<Request>
  transitionTimeoutMs?: number
  unstable_isConcurrent?: boolean
}

export function useRouter<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
>(
  routerFunction: RouterFunction<Request, Response>,
  options: UseRouterOptions<Request, Response> = {},
): RouterState<Request, Response> {
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
