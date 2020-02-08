import { Outlet } from '../../../outlets'

import { CacheKey } from './ResourceRef'
import { ResourceScopeState } from './ResourceState'
import { ResourceUpdate } from './ResourceUpdates'

export interface ResourceQueryType<
  Result = any,
  Vars = any,
  Context extends object = any
> {
  request(variables: Vars, context: Context): ResourceQuery<Result>
}

export interface ResourceQuery<Result = any> {
  // The cache keys in the output source will be kept in cache while there's an
  // active subscription.
  select(
    // A source for the current cache state, which will cause this resource to
    // be registered on the cache when there's an active subscription.
    source: Outlet<ResourceScopeState<any>>,
  ): Outlet<[Result, CacheKey[]]>

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
