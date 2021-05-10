import type { ParsedUrlQuery } from 'querystring'
import {
  FuseEffectSymbol,
  Fusor,
  Source,
  filter,
  fuse,
  mergeLatest,
  select,
} from 'retil-source'

export interface RoutingRedirectFunction {
  redirect(url: string): Promise<void>
  redirect(statusCode: number, url: string): Promise<void>
}

export interface RoutingEnvironmentResponse {
  getHeaders(): { [name: string]: number | string | string[] }
  setHeader(name: string, value: number | string | string[]): void
  statusCode: number
}

// TODO: this doesn't exactly work, as "basename" needs to differ at different
// points in the request tree.

export interface Location {
  hash: string
  pathname: string
  query: ParsedUrlQuery
  search: string
  state: object | null
}

export interface HistoryLocation extends Location {
  historyKey: string
}

export interface RetilEnvironment extends HistoryLocation {
  basename: string
  params: { [name: string]: string | string[] }
  redirect: RoutingRedirectFunction
  response: RoutingEnvironmentResponse
}

export interface SuspenseTracker {
  isReady(): boolean

  /**
   * Wait until all suspenses added to the response have resolved. This is
   * useful when using renderToString – but not necessary for the streaming
   * renderer.
   */
  waitUntilReady(): Promise<void>

  /**
   * Allows a router to indicate that the content will currently suspend,
   * and if it is undesirable to render suspending content, the router should
   * wait until there are no more pending promises.
   */
  willNotBeReadyUntil(promise: PromiseLike<any>): void
}

export interface InjectedRouteProps {
  abortSignal: AbortSignal
  routeKey: symbol
  suspenseTracker: SuspenseTracker
}

export interface RetilRouteProps extends RetilEnvironment, InjectedRouteProps {}

export type RouterFunction<
  Snapshot extends RouterRouteSnapshot = RouterRouteSnapshot
> = (snapshot: Readonly<Snapshot>) => ReactNode

export function extendEnvironmentSource(
  environmentSource,
  getExtension: (
    environmentSnapshot: Environment,
  ) => MaybePrecachedFusor | object,
) {
  return fuseMaybePrecached((use) => {
    const environmentSnapshot = use(environmentSource)
    const extension = getExtension(environmentSnapshot)
    return {
      ...extension,
      ...(typeof extension === 'function' ? extension(use) : extension),
    }
  })
}

export function route(routerFunction, environmentSource)
export function route(
  routerFunction,
  environmentExtension: (
    environment: Environment,
  ) => MaybePrecachedFusor | object,
)
export function route(
  routerFunction,
  environmentSource,
  environmentExtension: (
    environment: Environment,
  ) => MaybePrecachedFusor | object,
)
export function route<
  Environment extends RetilEnvironment = RetilEnvironment,
  EnvironmentExtension extends object = {}
>(
  routerFunction: RouterFunction,
  environmentSourceOrExtenion,
  environmentExtension?,
) {
  const extendedEnvironmentSource: Source<Environment & EnvironmentExtension>

  const source = fuseMaybePrecached((use) => {
    const environmentSnapshot = use(extendedEnvironmentSource)
    const abortController = new AbortController()
    const routeKey = Symbol()
    const routeProps = {
      ...environentSnapshot,

      abortSignal: abortController.signal,
      routeKey,
      suspenseTracker: new SuspenseTracker(),
    }

    return [routeProps, routerFunction(routeProps)]
  })

  return mergeLatest(filter(source, isNotPrecache))
}
