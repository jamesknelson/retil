import { ReactElement, ReactNode } from 'react'
import {
  HistoryAction,
  HistoryController,
  HistoryRequest,
  HistoryState,
} from 'retil-history'
import { Source } from 'retil-source'

export type RouterFunction<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
> = (request: Request, response: Response) => ReactNode

export interface RouterRequest<S extends HistoryState = HistoryState>
  extends HistoryRequest<S> {
  /**
   * Contains the parts of the url that are not meand to be matched on,
   * either because they've been matched by a previous router or because the
   * app is mounted on a subdirectory.
   */
  basename: string
  params: { [name: string]: string | string[] }
}

export interface RouterResponse {
  content?: never

  error?: any

  head: ReactElement[]

  // when redirecting, the redirect location is stored on the `Location` key
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

  // can be used to specify redirects, not found, etc.
  status?: number
}

export interface RouterSnapshot<
  Ext = {},
  S extends HistoryState = HistoryState,
  Response extends RouterResponse = RouterResponse
> {
  content: ReactNode
  request: RouterRequest<S> & Ext
  response: Response
}

export type RouterSource<
  Ext = {},
  S extends HistoryState = HistoryState,
  Response extends RouterResponse = RouterResponse
> = Source<RouterSnapshot<Ext, S, Response>>

export type RouterService<
  Ext = {},
  S extends HistoryState = HistoryState,
  Response extends RouterResponse = RouterResponse
> = readonly [
  RouterSource<Ext, S, Response>,
  RouterController<Ext, S, Response>,
]

export interface RouterController<
  Ext = {},
  S extends HistoryState = HistoryState,
  Response extends RouterResponse = RouterResponse
> extends HistoryController<S> {
  /**
   * Allows you to fetch a route response without actually rendering it.
   */
  prefetch(
    action: HistoryAction<S>,
    options?: {
      method?: string
    },
  ): Promise<RouterSnapshot<Ext, S, Response>>
}

/**
 * The snapshot returned by `useSnapshot` has an extra `pendingRequest` object
 * (which depends on when the content is rendered to the DOM), and is missing
 * the `response` property (which is mutable and can't be safeuly used inside
 * React).
 */
export interface Route<Ext = {}, State extends HistoryState = HistoryState> {
  /**
   * In concurrent mode, this will return the latest content -- and if the
   * current route is pending, it'll return the pending content.
   *
   * In legacy mode, it'll contain the most recent non-pending content.
   */
  content: React.ReactNode

  /**
   * If the browser location has changed but the request isn't ready to render
   * yet, this flag will be true.
   */
  pending: boolean

  /**
   * Contains the currently rendered request. Initially, this will contain
   * the initial request. In concurrent mode, the two trees will contain
   * different values for this.
   */
  request: RouterRequest<State> & Ext

  /**
   * The response is not provided, as it is a mutable object that can be
   * updated in ways that can't be properly rendered by React. To access the
   * response, pass an `onResponse` option.
   */
  response?: never
}