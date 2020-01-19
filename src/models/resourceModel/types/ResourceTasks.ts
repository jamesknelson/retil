import { ResourceValue, ResourceDataUpdate } from './ResourceValue'

export type ResourceInvalidator<Data, Key, Context extends object> = (options: {
  keys: Key[]
  /**
   * Indicate that the specified keys don't need to be invalidated.
   */
  abandon: (keys?: Key[]) => void
  /**
   * Invalidate the specified keys. Note, this cannot be done synchronously
   * with the function call; you'll want to wait some time before invalidating
   * anything.
   */
  invalidate: (keys?: Key[]) => void
  path: string
  context: Context
  values: (ResourceValue<Data> | null)[]
}) => () => void

export type ResourceLoader<Data, Key, Context extends object> = (options: {
  keys: Key[]
  /**
   * Abandoning a load will leave the key as-is in an expired state, and will
   * also prevent any further loads from being scheduled without a further
   * update.
   */
  abandon: (keys?: Key[]) => void
  /**
   * Put the resource into an unrecoverable error state. Where possible, prefer
   * to use `setRejection` instead -- as rejections can be recovered from.
   */
  error: (error: any) => void
  setData: (
    updates:
      | (readonly [Key, ResourceDataUpdate<Data, Key>])[]
      | {
          [path: string]: (readonly [Key, ResourceDataUpdate<Data, Key>])[]
        },
  ) => void
  /**
   * Allows you to mark the reason that the server did not provide data for a
   * requested key, e.g. it's not found (404), forbidden (403), etc.
   */
  setRejection: (reasons: (readonly [Key, string])[]) => void
  path: string
  context: Context
  signal: AbortSignal
}) => void | undefined | (() => void)

/**
 * Specify when to purge keys.
 */
export type ResourcePurger<Data, Key, Context extends object> = (options: {
  keys: Key[]
  /**
   * Remove the specified keys and their data from the store.
   */
  purge: (keys?: Key[]) => void
  context: Context
  path: string
  values: (ResourceValue<Data> | null)[]
}) => () => void

export type ResourceSubscriber<Data, Key, Context extends object> = (options: {
  keys: Key[]
  /**
   * Indicate that this task is no longer receiving updates for the specified
   * keys, and they should again be invalidated as usual by the invalidator
   * task.
   */
  abandon: (keys?: Key[]) => void
  /**
   * Put the resource into an unrecoverable error state. Where possible, prefer
   * to use `setRejection` instead -- as rejections can be recovered from.
   */
  error: (error: any) => void
  setData: (
    updates:
      | (readonly [Key, ResourceDataUpdate<Data, Key>])[]
      | {
          [path: string]: (readonly [Key, ResourceDataUpdate<Data, Key>])[]
        },
  ) => void
  /**
   * Allows you to mark the reason that the server did not provide data for a
   * requested key, e.g. it's not found (404), forbidden (403), etc.
   */
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
  load: null | string | false
  manualLoad: null | string
  purge: null | string
  subscribe: null | string | false
}
