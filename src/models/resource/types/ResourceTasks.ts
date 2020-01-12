import { ResourceUpdateCallback } from './ResourceUpdateCallback'
import { ResourceValue } from './ResourceValue'

// any keys that are not expired/marked as ever green once any cleanup function
// has been called will be automatically marked as evergreen.
export type ResourceExpireTask<Data, Key, Context extends object> = (options: {
  keys: Key[]
  // defaults to expiring all keys
  expire: (keys?: Key[]) => void
  // defaults to marking all keys as evergreen
  markAsEvergreen: (keys?: Key[]) => void
  context: Context
  values: (ResourceValue<Data> | null)[]
}) => void | undefined | (() => void)

// - any keys without a successful fetch once any cleanup function has been called
//   will be automatically abandoned.
// - values are *not* passed to the fetch strategy, so that there's no need to
//   restart the strategy on a manual update
export type ResourceFetchTask<Data, Key, Context extends object> = (options: {
  keys: Key[]
  abandon: (keys?: Key[]) => void
  update: (
    results: {
      key: Key
      update: ResourceValue<Data> | ResourceUpdateCallback<Data, Key>
      expired?: boolean
    }[],
  ) => void
  context: Context
}) => void | undefined | (() => void)

// any keys that are unpurged once any cleanup function has been called will
// be automatically purged.
export type ResourcePurgeTask<Data, Key, Context extends object> = (options: {
  keys: Key[]
  purge: (keys?: Key[]) => void
  context: Context
  values: (ResourceValue<Data> | null)[]
}) => void | undefined | (() => void)

export type ResourceSubscribeTask<
  Data,
  Key,
  Context extends object
> = (options: {
  keys: Key[]
  abandon: (keys?: Key[]) => void
  update: (values: [Key, ResourceValue<Data>]) => void
  context: Context
}) => () => void

export type ResourceTaskType = 'expire' | 'fetch' | 'purge' | 'subscribe'

export interface ResourceTask<Data, Key, Context extends object> {
  type: ResourceTaskType
  keys: Key[]
  id: string
  context: Context
  path: string
  values: (ResourceValue<Data> | null)[]
}

export type ResourceKeyTasks = {
  expire: null | string | false
  fetch: null | string | false
  purge: null | string
  subscribe: null | string | false
}
