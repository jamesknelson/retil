import { ResourceValue, ResourceDataUpdate } from './ResourceValue'

// any keys that are not stale/marked as ever green once any cleanup function
// has been called will be automatically marked as evergreen.
export type ResourceInvalidator<Data, Key, Context extends object> = (options: {
  keys: Key[]
  // defaults to expiring all keys
  abandon: (keys?: Key[]) => void
  invalidate: (keys?: Key[]) => void
  path: string
  context: Context
  values: (ResourceValue<Data> | null)[]
}) => void | undefined | (() => void)

// - any keys without a successful fetch once any cleanup function has been called
//   will be automatically abandoned.
// - values are *not* passed to the fetch strategy, so that there's no need to
//   restart the strategy on a manual update
export type ResourceLoader<Data, Key, Context extends object> = (options: {
  keys: Key[]
  /**
   * Abandonding a load will leave the key as-is in an expired state, and will
   * also prevent any further loads from being scheduled without a further
   * update.
   */
  abandon: (keys?: Key[]) => void
  error: (error: any) => void
  setData: (
    // TODO: allow updates to multiple paths, so that a loader can store
    // any nested data that it receives
    // | {
    //     [path: string]: ResourceDataUpdateList<Data, Key>
    //   },
    updates: (readonly [Key, ResourceDataUpdate<Data, Key>])[],
  ) => void
  setRejection: (reasons: (readonly [Key, string])[]) => void
  path: string
  context: Context
  signal: AbortSignal
}) => void | undefined | (() => void)

// any keys that are unpurged once any cleanup function has been called will
// be automatically purged.
export type ResourcePurger<Data, Key, Context extends object> = (options: {
  keys: Key[]
  purge: (keys?: Key[]) => void
  context: Context
  path: string
  values: (ResourceValue<Data> | null)[]
}) => void | undefined | (() => void)

export type ResourceSubscriber<Data, Key, Context extends object> = (options: {
  keys: Key[]
  abandon: (keys?: Key[]) => void
  error: (error: any) => void
  setData: (
    // TODO: allow updates to multiple paths, so that a subscriber can store
    // any nested data that it receives
    // | {
    //     [path: string]: ResourceDataUpdateList<Data, Key>
    //   },
    updates: (readonly [Key, ResourceDataUpdate<Data, Key>])[],
  ) => void
  setRejection: (reasons: (readonly [Key, string])[]) => void
  path: string
  context: Context
  // Signal is provided so that a fetch strategy can be used in place of a
  // subscribe strategy on the server.
  signal: undefined
}) => () => void

export interface ResourceTaskConfig<Data, Key, Context extends object> {
  invalidate: ResourceInvalidator<Data, Key, Context> | null
  load: ResourceLoader<Data, Key, Context> | null
  purge: ResourcePurger<Data, Key, Context> | null
  subscribe: ResourceSubscriber<Data, Key, Context> | null
}

export type ResourceTaskQueueType = 'start' | 'pause' | 'stop'

export interface ResourceTask<Data, Key, Context extends object> {
  type: ResourceTaskType
  keys: Key[]
  id: string
  context: Context
  path: string
  values: (ResourceValue<Data> | null)[]
}

export type ResourceTaskType =
  | 'invalidate'
  | 'manualLoad'
  | 'load'
  | 'purge'
  | 'subscribe'

export type ResourceKeyTasks = {
  invalidate: null | string | false
  manualLoad: null | string
  load: null | string | false
  purge: null | string
  subscribe: null | string | false
}
