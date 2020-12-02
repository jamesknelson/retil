import { Source } from 'retil-source'
import { ParsedUrlQuery } from 'querystring'

export type HistoryTrigger = 'PUSH' | 'REPLACE' | 'POP'

export type HistoryState = object

export type HistoryAction<S extends HistoryState = HistoryState> =
  | string
  | HistoryActionObject<S>

export interface HistoryActionObject<S extends HistoryState = HistoryState> {
  hash?: string
  pathname?: string
  query?: ParsedUrlQuery
  search?: string
  state?: S | null
}

export interface HistoryLocation<S extends HistoryState = HistoryState> {
  hash: string
  pathname: string
  query: ParsedUrlQuery
  search: string
  state: S | null
}

export interface HistoryRequest<S extends HistoryState = HistoryState>
  extends HistoryLocation<S> {
  /**
   * This is applied to individual requests that have actually been added to
   * the browser history.
   */
  key?: string

  /**
   * If this request was pre-planned by calling the `plan` function, this
   * will always contain an object that is referentially equal to the
   * original `plan`.
   */
  planId?: symbol
}

export interface HistoryRequestPlan<S extends HistoryState = HistoryState>
  extends HistoryRequest<S> {
  planId: symbol
}

export type HistorySnapshot<
  Ext = {},
  S extends HistoryState = HistoryState
> = HistoryRequest<S> & Ext

export type HistorySource<
  Ext = {},
  S extends HistoryState = HistoryState
> = Source<HistorySnapshot<Ext, S>>

export type HistoryService<
  Ext = {},
  S extends HistoryState = HistoryState
> = readonly [HistorySource<Ext, S>, HistoryController<{}, S>]

export interface HistoryController<
  Ext = {},
  S extends HistoryState = HistoryState
> {
  back(): Promise<boolean>

  block(blocker: HistoryBlockPredicate<S>): Unblock

  navigate(
    action: HistoryAction<S>,
    options?: {
      /**
       * Bypass any blocks and navigate immediately. Useful for redirects, which
       * should not be blocked.
       */
      force?: boolean
      replace?: boolean
    },
  ): Promise<boolean>

  plan(action: HistoryAction<S>): Promise<HistoryRequestPlan<S> & Ext>
}

export type HistoryBlockPredicate<S extends HistoryState = HistoryState> = (
  location: HistoryLocation<S>,
  action: HistoryTrigger,
) => Promise<boolean>

export type Unblock = () => void

export type HistoryLocationReducer<S extends HistoryState = HistoryState> =
  // This returns a partial request, as a key and cache still need to be added
  // by the router itself.
  (location: HistoryLocation<S>, action: HistoryAction<S>) => HistoryLocation<S>
