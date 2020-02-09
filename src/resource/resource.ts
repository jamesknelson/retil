import { Outlet } from '../outlets'

import { ChunkList } from './structures/chunk'
import { PointerPicker } from './structures/pointer'

export interface Resource<
  Result = any,
  Vars = any,
  Context extends object = any
> {
  request(vars: Vars, context: Context): ResourceRequest<Result>
}

export interface ResourceRequest<Result = any> {
  // Each new pick function will record all picked ids, keeping them in the
  // cache until the next pick function is output. These keys can also be used
  // to decide whether to re-build a specific query when a new state is
  // received.
  select(source: Outlet<PointerPicker>): Outlet<Result>

  load?: (actions: ResourceRequestActions) => void | undefined | (() => void)

  subscribe?: (actions: ResourceRequestActions) => () => void
}

export interface ResourceRequestActions {
  /**
   * Indicate that this task is no longer receiving updates for its query,
   * so it should again be invalidated as usual by the invalidator task.
   */
  abandon: () => void

  /**
   * Put the resource into an unrecoverable error state. Where possible, prefer
   * to use `setRejection` instead -- as rejections can be recovered from.
   */
  error: (error: any) => void

  update: (updates: ChunkList) => void
}
