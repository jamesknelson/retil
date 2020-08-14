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
  state?: S
}

export interface HistoryLocation<S extends HistoryState = HistoryState> {
  hash: string
  pathname: string
  query: ParsedUrlQuery
  search: string
  state: S
}

export interface HistoryRequest<S extends HistoryState = HistoryState>
  extends HistoryLocation<S> {
  key: string
  method: string
}

export interface HistorySnapshot<S extends HistoryState = HistoryState> {
  pendingLocation: HistoryLocation<S> | null
  request: HistoryRequest<S>
  trigger: HistoryTrigger
}

export type HistorySource<S extends HistoryState = HistoryState> = Source<
  HistorySnapshot<S>
>

export type HistoryService<S extends HistoryState = HistoryState> = readonly [
  HistorySource<S>,
  HistoryController<S>,
]

export interface HistoryController<S extends HistoryState = HistoryState> {
  back(): Promise<boolean>

  block(blocker: HistoryBlockPredicate<S>): Unblock

  navigate(
    action: string | HistoryAction<S>,
    options?: {
      method?: string
      replace?: boolean
    },
  ): Promise<boolean>
}

export type HistoryBlockPredicate<S extends HistoryState = HistoryState> = (
  location: HistoryLocation<S>,
  action: HistoryTrigger,
) => Promise<boolean>

export type Unblock = () => void
