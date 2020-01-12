import { ResourceUpdateCallback } from './ResourceUpdateCallback'
import { ResourceValue } from './ResourceValue'

export type ResourceEffect<Data, Key, Context extends object> = (
  states: {
    key: Key
    value: ResourceValue<Data> | null
  },
  context: Context,
) => void | undefined | (() => void)

// any keys that are not expired/marked as ever green once any cleanup function
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
  context: Context
  values: (ResourceValue<Data> | null)[]
}) => void | undefined | (() => void)

// - any keys without a successful fetch once any cleanup function has been called
//   will be automatically abandoned.
// - values are *not* passed to the fetch strategy, so that there's no need to
//   restart the strategy on a manual update
export type ResourceFetchStrategy<
  Data,
  Key,
  Context extends object
> = (options: {
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
export type ResourcePurgeStrategy<
  Data,
  Key,
  Context extends object
> = (options: {
  keys: Key[]
  purge: (keys?: Key[]) => void
  context: Context
  values: (ResourceValue<Data> | null)[]
}) => void | undefined | (() => void)

export type ResourceSubscribeStrategy<
  Data,
  Key,
  Context extends object
> = (options: {
  keys: Key[]
  abandon: (keys?: Key[]) => void
  update: (values: [Key, ResourceValue<Data>]) => void
  context: Context
}) => () => void

export type ResourceTaskType =
  | 'effect' // called *at least* once for cached value
  | 'expire'
  | 'fetch'
  | 'purge'
  | 'subscribe'

export interface ResourceTaskStub<Key> {
  type: ResourceTaskType
  keys: Key[]
}
export interface ResourceTask<Data, Key, Context extends object>
  extends ResourceTaskStub<Key> {
  id: string
  context: Context
  path: string[]
  values?: (ResourceValue<Data> | null)[]
}

export type ResourceKeyTasks = {
  effect: null | string
  expire: null | string | false
  fetch: null | string | false
  purge: null | string
  subscribe: null | string | false
}
