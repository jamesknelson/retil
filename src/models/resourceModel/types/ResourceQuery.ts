import { Outlet } from '../../../outlets'

import { ResourceRef } from './ResourceRef'
import { ResourceRefState } from './ResourceState'
import { ResourceDataUpdate } from './ResourceValue'

export interface ResourceQuery<Result = any, Data = any, Rejection = any> {
  /**
   * Specifies all data required by the query that isn't loaded by subscribing
   * to another query within `mapStateToResult`. Note that this data *may not*
   * all be stored directly on the ref states, but when a task exists to
   * load or subscribe to these refs, all data required by the query should be
   * returned. This way, there only needs to be *one* network task active for
   * these refs, even if there are multiple queries.
   */
  refs: readonly ResourceRef[]

  sub(
    getRefStatesSub: (
      refs: ResourceRef[],
    ) => Outlet<ResourceRefState<Data, Rejection>[]>,
  ): Outlet<Result>

  load?: <Data, Rejection = string>(options: {
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
    setData: (updates: ResourceQueryDataUpdates<Data>) => void
    /**
     * Allows you to mark the reason that the server did not provide data for a
     * requested key, e.g. it's not found (404), forbidden (403), etc.
     */
    setRejection: (rejections: ResourceQueryRejectionUpdates<Rejection>) => void
  }) => void | undefined | (() => void)

  subscribe?: <Data, Rejection = string>(options: {
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

    setData: (updates: ResourceQueryDataUpdates<Data>) => void
    /**
     * Allows you to mark the reason that the server did not provide data for a
     * requested key, e.g. it's not found (404), forbidden (403), etc.
     */
    setRejection: (rejections: ResourceQueryRejectionUpdates<Rejection>) => void
  }) => () => void
}

export type ResourceQueryDataUpdates<Data> = (readonly [
  /* type */ string,
  /* id */ string | number,
  ResourceDataUpdate<Data>,
])[]

export type ResourceQueryRejectionUpdates<Rejection> = (readonly [
  /* type */ string,
  /* id */ string | number,
  Rejection,
])[]
