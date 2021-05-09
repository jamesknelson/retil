import { ReactNode } from 'react'
import {
  HistoryAction,
  HistoryBlockPredicate,
  HistoryController,
  HistoryLocation,
  HistorySnapshot,
} from 'retil-history'
import { Source } from 'retil-source'

export type RouterAction = HistoryAction<object>
export type RouterBlockPredicate = HistoryBlockPredicate<object>
export type RouterLocation = HistoryLocation<object>

export type RouterFunction<
  Snapshot extends RouterRouteSnapshot = RouterRouteSnapshot
> = (snapshot: Readonly<Snapshot>) => ReactNode

export interface RouterSnapshotExtension {
  /**
   * This is unique for each time the router service passes a context to the
   * root-level router function.
   */
  routerKey: symbol

  // how do we define that the parent context can supply default values for
  // these for us?
  basename: string
  params: { [name: string]: string | string[] }

  // This will be set by the router that wraps the content in a react context
  // provider
  content?: any

  // Note: this will be extracted from the context passed to the react app
  // itself, as it's mutable and only meant to be accessed by the router
  // functions.
  response: RouterResponse
}

export interface RouterResponse {
  // if there's an error, it can be stored here
  error?: any

  headers?: { [name: string]: string }

  /**
   * can be used to specify redirects, not found, etc.
   **/
  status?: number

  isReady(): boolean

  /**
   * Helper to set the response status and headers as required for a redirect.
   */
  redirect(url: string): Promise<void>
  redirect(statusCode: number, url: string): Promise<void>

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

export interface RouterRouteSnapshot
  extends HistorySnapshot<object>,
    RouterSnapshotExtension {}

export type RouterSource<
  RouteSnapshot extends RouterRouteSnapshot = RouterRouteSnapshot
> = Source<RouteSnapshot>

export type RouterService<
  RouteSnapshot extends RouterRouteSnapshot = RouterRouteSnapshot
> = readonly [RouterSource<RouteSnapshot>, RouterController]

export interface RouterHistorySnapshot
  extends HistorySnapshot<object>,
    Partial<RouterSnapshotExtension> {}

export type RouterRequestService<
  HistorySnapshot extends RouterHistorySnapshot = RouterHistorySnapshot
> = readonly [
  Source<RouterHistorySnapshot>,
  HistoryController<object, HistorySnapshot>,
]

export type RouterController<
  RouteSnapshot extends RouterRouteSnapshot = RouterRouteSnapshot
> = HistoryController<object, RouteSnapshot>

export interface MountedRouterController<
  RouteSnapshot extends RouterRouteSnapshot = RouterRouteSnapshot
> extends RouterController {
  /**
   * Waits until navigation is no longer in progress, and return the snapshot
   * at that time.
   */
  waitUntilNavigationCompletes: () => Promise<RouteSnapshot>
}

export type MountedRouterState<
  Snapshot extends RouterRouteSnapshot = RouterRouteSnapshot
> = readonly [
  snapshot: Omit<RouterRouteSnapshot, 'response'> & { content: ReactNode },
  controller: MountedRouterController<Snapshot>,
  pendingSnapshot: RouterRouteSnapshot | boolean,
]
