import {
  RouterRouteSnapshot,
  RouterResponse,
  RouterSource,
  RouterRouteSnapshot,
} from '../routerTypes'

export interface UseRouterSourceOptions {
  transitionTimeoutMs?: number
  unstable_isConcurrent?: boolean
}

export interface UseRouterSourceFunction {
  <
    Request extends RouterRouteSnapshot = RouterRouteSnapshot,
    Response extends RouterResponse = RouterResponse
  >(
    source: RouterSource<Request, Response>,
    options?: UseRouterSourceOptions,
  ): readonly [RouterRouteSnapshot<Request, Response>, Request | boolean]
}
