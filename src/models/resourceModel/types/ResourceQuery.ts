import { Outlet } from '../../../outlets'

import { ResourceUpdate } from './ResourceUpdates'
import { SchematicPickFunction } from '../resource'

export interface ResourceQueryType<
  Result = any,
  Vars = any,
  Context extends object = any
> {
  request(variables: Vars, context: Context): ResourceQuery<Result>
}

export interface ResourceQuery<Result = any> {
  // Each new pick function will record all picked ids, keeping them in the
  // cache until the next pick function is output. These keys can also be used
  // to decide whether to re-build a specific query when a new state is
  // received.
  select(source: Outlet<SchematicPickFunction>): Outlet<Result>

  load?: (options: {
    /**
     * Abandoning a load will leave the queries docs as-is in an expired state,
     * and will also prevent any further loads from being scheduled without a
     * further update.
     */
    abandon: () => void
    /**
     * Put the resource into an unrecoverable error state. Where possible, prefer
     * to use `setRejection` instead -- as rejections can be recovered from.
     */
    error: (error: any) => void

    update: (updates: readonly ResourceUpdate<any, any, any>[]) => void
  }) => void | undefined | (() => void)

  subscribe?: (options: {
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

    update: (updates: readonly ResourceUpdate<any, any, any>[]) => void
  }) => () => void
}
