import { ReactElement, ReactNode } from 'react'
import {
  HistoryAction,
  HistoryBlockPredicate,
  HistoryLocation,
  HistoryRequest,
} from 'retil-history'
import { Source } from 'retil-source'

export interface MaybePrecachedRequest {
  precacheId?: symbol
}

export interface PrecachedRequest {
  precacheId: symbol
}

export type RouterAction = HistoryAction<object>
export type RouterBlockPredicate = HistoryBlockPredicate<object>
export type RouterLocation = HistoryLocation<object>

export type RouterFunction<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
> = (request: Request, response: Response) => ReactNode

export interface RouterRequestExtension {
  /**
   * Contains the parts of the url that are not meand to be matched on,
   * either because they've been matched by a previous router or because the
   * app is mounted on a subdirectory.
   */
  basename: string
  params: { [name: string]: string | string[] }
}

export interface RouterRequest
  extends HistoryRequest<object>,
    RouterRequestExtension {}

export type RouterRequestSource = Source<RouterRequest>

export interface RouterResponseRedirect {
  (url: string): Promise<void>
  (statusCode: number, url: string): Promise<void>
}

export interface RouterResponse {
  content?: never

  error?: any

  head: ReactElement[]

  headers: { [name: string]: string }

  /**
   * Allows a router to indicate that the content will currently suspend,
   * and if it is undesirable to render suspending content, the router should
   * wait until there are no more pending promises.
   *
   * Note that this array can be mutated, so once the known promises are
   * resolved, you should always check if any more promises have been added.
   */
  pendingSuspenses: PromiseLike<any>[]

  /**
   * Calling this will navigate the underlying history to a new url, so long
   * as the router is still active.
   */
  redirect: RouterResponseRedirect

  // can be used to specify redirects, not found, etc.
  status?: number
}

export interface RouterSnapshot<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
> {
  content: ReactNode
  request: Request
  response: Response
}

export type RouterSource<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
> = Source<RouterSnapshot<Request, Response>>

export type RouterService<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
> = readonly [RouterSource<Request, Response>, RouterController]

export type RouterRequestService<
  Request extends MaybePrecachedRequest
> = readonly [Source<Request>, RouterRequestController<Request>]

export interface RouterRequestController<
  Request extends MaybePrecachedRequest = HistoryRequest
> {
  block(predicate: RouterBlockPredicate): () => void
  navigate(
    action: RouterAction,
    options?: {
      force?: boolean
      replace?: boolean
    },
  ): Promise<boolean>
  precache(action: RouterAction): Promise<Request & PrecachedRequest>
}

export interface RouterController<
  Request extends RouterRequest & MaybePrecachedRequest = RouterRequest
> {
  block(predicate: RouterBlockPredicate): () => void

  navigate(
    action: RouterAction,
    options?: {
      force?: boolean
      replace?: boolean
    },
  ): Promise<boolean>

  /**
   * Allows you to fetch a route response without actually rendering it.
   */
  precache(
    action: RouterAction,
  ): Promise<RouterSnapshot<Request & PrecachedRequest>>
}

export interface RouterReactController<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
> extends RouterController {
  /**
   * Waits until navigation is no longer in progress, and return the snapshot
   * at that time.
   */
  waitUntilNavigationCompletes: () => Promise<RouterSnapshot<Request, Response>>
}

export interface RouterState<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
> extends RouterReactController<Request, Response> {
  /**
   * In concurrent mode, this will return the latest content -- and if the
   * current route is pending, it'll return the pending content.
   *
   * In legacy mode, it'll contain the most recent non-pending content.
   */
  content: React.ReactNode

  pending: Request | boolean

  /**
   * Contains the currently rendered request. Initially, this will contain
   * the initial request. In concurrent mode, the two trees will contain
   * different values for this.
   */
  request: Request

  /**
   * The response is not provided, as it is a mutable object that can be
   * updated in ways that can't be properly rendered by React. To access the
   * response, pass an `onResponse` option, or call
   * `waitUntilNavigationCompletes`.
   */
  response?: never
}
