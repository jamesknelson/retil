import {
  RouterRequest,
  RouterResponse,
  RouterSource,
  RouterSnapshot,
} from '../routerTypes'

export interface UseRouterSourceOptions {
  transitionTimeoutMs?: number
  unstable_isConcurrent?: boolean
}

export interface UseRouterSourceFunction {
  <
    Request extends RouterRequest = RouterRequest,
    Response extends RouterResponse = RouterResponse
  >(
    source: RouterSource<Request, Response>,
    options?: UseRouterSourceOptions,
  ): readonly [RouterSnapshot<Request, Response>, Request | boolean]
}
