import { Outlet } from '../../../outlets'

import { ResourceCache } from './Resource'
import { ResourceRef } from './ResourceRef'
import { ResourceSchema } from './ResourceSchema'
import { ResourceRefState } from './ResourceState'
import { ResourceDataUpdate, ResourceRejectionUpdate } from './ResourceUpdates'

export interface ResourceQueryType<
  Result = any,
  Variables = any,
  Context extends object = any,
  Schema extends ResourceSchema = any
> {
  (variables: Variables, context: Context): ResourceQuery<Result, Schema>
}

export interface ResourceQuery<
  Result = any,
  Schema extends ResourceSchema = any,
  RefTypes extends (keyof Schema)[] = any
> {
  /**
   * Specifies all data required by the query that isn't loaded by subscribing
   * to another query within `mapStateToResult`. Note that this data *may not*
   * all be stored directly on the ref states, but when a task exists to
   * load or subscribe to these refs, all data required by the query should be
   * returned. This way, there only needs to be *one* network task active for
   * these refs, even if there are multiple queries.
   */
  readonly refs: readonly ResourceRef<Schema>[]

  select(
    // A sub for the state of the query's specified refs
    subs: {
      [Index in Extract<keyof RefTypes, number>]: Outlet<{
        state: ResourceRefState<Schema, RefTypes[Index]>
        pending: boolean
        primed: boolean
      }>
    },
    // The cache object from which this query was made, allowing you to make
    // nested queries.
    cache: ResourceCache<any, Schema>,
  ): Outlet<Result>

  load?: (options: {
    signal: AbortSignal

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
    setData: <Types extends keyof Schema>(
      updates: ResourceDataUpdate<Schema, Types>[],
    ) => void
    /**
     * Allows you to mark the reason that the server did not provide data for a
     * requested key, e.g. it's not found (404), forbidden (403), etc.
     */
    setRejection: <Types extends keyof Schema>(
      rejections: ResourceRejectionUpdate<Schema, Types>[],
    ) => void
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

    setData: <Types extends keyof Schema>(
      updates: ResourceDataUpdate<Schema, Types>[],
    ) => void
    /**
     * Allows you to mark the reason that the server did not provide data for a
     * requested key, e.g. it's not found (404), forbidden (403), etc.
     */
    setRejection: <Types extends keyof Schema>(
      rejections: ResourceRejectionUpdate<Schema, Types>[],
    ) => void
  }) => () => void
}
