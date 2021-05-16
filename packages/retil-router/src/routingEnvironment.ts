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

export interface InjectedRouteProps {
  abortSignal: AbortSignal
  routeKey: symbol
  suspenseTracker: SuspenseTracker
}

export interface RetilRouteProps extends RetilEnvironment, InjectedRouteProps {}

export type RouterFunction<
  Snapshot extends RouterRouteSnapshot = RouterRouteSnapshot,
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
