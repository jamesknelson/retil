import { Outlet } from '../../../outlets'

import { ResourceCache } from './Resource'
import { ResourceRecordPointer } from './ResourceRef'
import { ResourceUpdate } from './ResourceUpdates'
import { ResourceRefState } from './ResourceState'

export interface ResourceQueryType<
  Result = any,
  Vars = any,
  Context extends object = any
> {
  request(variables: Vars, context: Context): ResourceQuery<Result>
}

export interface ResourceQuery<
  Result = any,
  Root extends ResourceRecordPointer = any
> {
  /**
   * Specifies all data required by the query that isn't loaded by subscribing
   * to another query within `mapStateToResult`. Note that this data *may not*
   * all be stored directly on the ref states, but when a task exists to
   * load or subscribe to these refs, all data required by the query should be
   * returned. This way, there only needs to be *one* network task active for
   * these refs, even if there are multiple queries.
   */
  readonly root: Root

  select(
    // A sub for the state of the query's specified refs
    source: Outlet<{
      pending: boolean
      primed: boolean
      state: ResourceRefState
    }>,
    // The cache object from which this query was made, allowing you to make
    // nested queries.
    cache: ResourceCache<any, any>,
  ): Outlet<Result>

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
