import { ResourceUpdate } from './ResourceUpdate'
import { ResourceValue } from './ResourceValue'

// any keys that are not stale/marked as ever green once any cleanup function
// has been called will be automatically marked as evergreen.
export type ResourceExpireStrategy<
  Data,
  Key,
  Context extends object
> = (options: {
  keys: Key[]
  // defaults to expiring all keys
  expire: (keys?: Key[]) => void
  // defaults to marking all keys as evergreen
  markAsEvergreen: (keys?: Key[]) => void
  path: string
  context: Context
  values: (ResourceValue<Data> | null)[]
}) => void | undefined | (() => void)

// - any keys without a successful fetch once any cleanup function has been called
//   will be automatically abandoned.
// - values are *not* passed to the fetch strategy, so that there's no need to
//   restart the strategy on a manual update
export type ResourceLoadStrategy<
  Data,
  Key,
  Context extends object
> = (options: {
  keys: Key[]
  abandon: (keys?: Key[]) => void
  error: (error: any) => void
  update: (update: ResourceUpdate<Data, Key>) => void
  path: string
  context: Context
  signal: AbortSignal
}) => void | undefined | (() => void)

// any keys that are unpurged once any cleanup function has been called will
// be automatically purged.
export type ResourcePurgeStrategy<
  Data,
  Key,
  Context extends object
> = (options: {
  keys: Key[]
  purge: (keys?: Key[]) => void
  context: Context
  path: string
  values: (ResourceValue<Data> | null)[]
}) => void | undefined | (() => void)

export type ResourceSubscribeStrategy<
  Data,
  Key,
  Context extends object
> = (options: {
  keys: Key[]
  abandon: (keys?: Key[]) => void
  error: (error: any) => void
  update: (update: ResourceUpdate<Data, Key>) => void
  path: string
  context: Context
}) => () => void

export interface ResourceTaskConfig<Data, Key, Context extends object> {
  expire: ResourceExpireStrategy<Data, Key, Context> | null
  load: ResourceLoadStrategy<Data, Key, Context> | null
  purge: ResourcePurgeStrategy<Data, Key, Context> | null
  subscribe: ResourceSubscribeStrategy<Data, Key, Context> | null
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
  | 'expire'
  | 'forceLoad'
  | 'load'
  | 'purge'
  | 'subscribe'

export type ResourceKeyTasks = {
  expire: null | string | false
  forceLoad: null | string
  load: null | string | false
  purge: null | string
  subscribe: null | string | false
}
