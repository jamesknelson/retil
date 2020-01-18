import { ResourceValue, ResourceDataUpdate } from './ResourceValue'

export type ResourceInvalidator<Data, Key, Context extends object> = (options: {
  keys: Key[]
  // defaults to expiring all keys
  abandon: (keys?: Key[]) => void
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
  error: (error: any) => void
  setData: (
    updates:
      | (readonly [Key, ResourceDataUpdate<Data, Key>])[]
      | {
          [path: string]: (readonly [Key, ResourceDataUpdate<Data, Key>])[]
        },
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
    updates:
      | (readonly [Key, ResourceDataUpdate<Data, Key>])[]
      | {
          [path: string]: (readonly [Key, ResourceDataUpdate<Data, Key>])[]
        },
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
  load: null | string | false
  manualLoad: null | string
  purge: null | string
  subscribe: null | string | false
}
