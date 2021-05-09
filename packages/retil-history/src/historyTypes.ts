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

export interface HistorySnapshot<S extends HistoryState = HistoryState>
  extends HistoryLocation<S> {
  /**
   * This is applied to individual requests that have actually been added to
   * the browser history.
   */
  historyKey?: string

  /**
   * If this context was precached by the `precache` function, then this will
   * will contain a symbol that is referentially equal to the value in the
   * orbject returned by that function.
   */
  precacheKey?: symbol
}

export interface PrecachedSnapshot {
  precacheKey: symbol
}

export type HistorySource<S extends HistoryState = HistoryState> = Source<
  HistorySnapshot<S>
>

export type HistoryService<S extends HistoryState = HistoryState> = readonly [
  HistorySource<S>,
  HistoryController<S>,
]

export interface HistoryController<
  State extends HistoryState = HistoryState,
  Snapshot extends HistorySnapshot = HistorySnapshot
> {
  back(): Promise<boolean>

  block(blocker: HistoryBlockPredicate<State>): Unblock

  navigate(
    action: HistoryAction<State>,
    options?: {
      /**
       * Bypass any blocks and navigate immediately. Useful for redirects, which
       * should not be blocked.
       */
      force?: boolean
      replace?: boolean
    },
  ): Promise<boolean>

  precache(action: HistoryAction<State>): Promise<Snapshot & PrecachedSnapshot>
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
