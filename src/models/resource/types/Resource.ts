import { Outlet } from 'outlets'
import { Store } from 'store'

import { ResourceRequestPolicy } from './ResourceRequestPolicy'
import { ResourceState } from './ResourceState'
import {
  ResourceEffect,
  ResourceExpireStrategy,
  ResourceFetchStrategy,
  ResourcePurgeStrategy,
  ResourceSubscribeStrategy,
} from './ResourceTasks'
import { ResourceUpdateCallback } from './ResourceUpdateCallback'

// TODO:
// - function to create default strategies -- so you can pass optional:
//   * key => URL fn (defaults to using URL as key)
//   * fetch function
//   * headers
//   * response => isEmpty function (defaults to treating 404 as empty)
//   * response => forbidden function (defaults to treating 403 as forbidden)
//   * response => expired function (default uses stale-while-revalidate headers)
//   * number of fetch retries
//   * poll interval (expires after this interval)
//   * ttl (for purge strategy)
//   * subscribe/effect/computeHashForKey/computeHashForContext are passed through

export type ResourceContext = { store?: Store }

export interface ResourceOptions<
  Data,
  Key,
  Context extends ResourceContext,
  DefaultSelected = Data
> {
  /**
   * An optional function for computing string keys from model keys,
   * which is required as documents are stored with string keys internally.
   *
   * By default, this uses JSON.stringify()
   */
  computeHashForKey?: (key: Key) => string

  /**
   * An optional function for computing a secondary key based on the context, so
   * that different contexts will be keyed to different stores.
   *
   * By default, if the property `context.key` is a string, then this will be
   * used. Otherwise, a unique value will be computed for each new context
   * object.
   */
  computePathForContext?: (context: Context) => string[]

  context?: Context

  /**
   * If provided, this will be called whenever the value changes. Then, if a
   * function is returned, it will be called after the snapshot changes again,
   * or after the data is purged.
   *
   * Use this function to perform side effects based on the currently stored
   * data.
   *
   * For example, if this model contains lists of foreign keys, you could create
   * an effect to `hold()` those keys within another model. Similarly, if this
   * model contains items that are indexed in another model, you could use an
   * effect to expire indexes as the indexed items change.
   */
  effect?: ResourceEffect<Data, Key, Context>

  /**
   * Strategy to run when we have up to date data. Can expire the data after
   * some amount of time to re-fetch it. By default, expires after an hour.
   */
  expire?: ResourceExpireStrategy<Data, Key, Context>

  /**
   * Configures how to upate data once there are active subscriptions. This will
   * be called for any keys with subscriptions, and with missing or expired data.
   * It will *not* be called for keys that have holds but no subscriptions.
   *
   * The strategy can also return a function that will be called should the
   * resource decide that a load is no longer needed - allowing the strategy to
   * free up any resources being used.
   */
  fetch?: ResourceFetchStrategy<Data, Key, Context>

  preloadedState?: ResourceState<Data, Key>

  /**
   * Configures how to purge data when there are no longer any active holds.
   *
   * If a number is given, data will be purged that many milliseconds after
   * the last hold is released.
   *
   * If a function is given, it'll be called with a purge function that should
   * be called once the data should be purged. This function should also
   * return a function which can be called to *cancel* a purge, should the
   * state change before the purge takes place -- in which case the strategy
   * function will be called again with the new state.
   */
  purge?: ResourcePurgeStrategy<Data, Key, Context>

  requestPolicy?: ResourceRequestPolicy | null

  select?: ResourceKeySelector<Data, Key, DefaultSelected>

  storeKey?: string

  subscribe?: ResourceSubscribeStrategy<Data, Key, Context>
}

export interface Resource<Data, Key, DefaultSelected = Data> {
  dehydrate(): Promise<ResourceState<Data, Key> | undefined>

  /**
   * Return an outlet and controller for the specified key, from which you can
   * get the latest value, or imperatively make changes.
   *
   * By default, the outlet will just return the data, and will end up in an
   * error state if the data is missing and no further fetches will be made.
   * However, you can configure the output shape by passing a `select` function
   * object which maps available data to an output format.
   *
   * Internally, ES5 getters are used to detect which data has been selected --
   * so that the output of getCurrentValue can be set to an error or promise as
   * necessary.
   */
  key<Selected = DefaultSelected>(
    query: Key,
    options?: ResourceKeyOptions<Data, Key, Selected>,
  ): [Outlet<Selected>, ResourceKeyController<Data, Key>]

  /**
   * Return a handle for an array of keys, from which you can get
   * and subscribe to multiple values at once.
   *
   * An error in any key will cause an error, while pending/missing values
   * on any key will cause a promise to be thrown.
   */
  keys<Selected = DefaultSelected>(
    keys: Key[],
    options?: ResourceKeyOptions<Data, Key, Selected>,
  ): [Outlet<Selected[]>, ResourceKeyController<Data[], Key[]>]

  /**
   * Return a list of the keys currently stored in the model for the given
   * path.
   */
  knownKeys(...path: string[]): Key[]

  path(...path: string[]): Resource<Data, Key>
}

export interface ResourceKeyController<Data, Key> {
  /**
   * Marks the key as no longer existing.
   */
  delete(): void

  /**
   * Marks this key's currently stored state as possible out of date.
   *
   * If there's an active subscription, a new version of the data will be
   * fetched if possible.
   */
  expire(): void

  /**
   * Imperatively schedule a fetch, even if paused or if the data already
   * exists. This will cancel any running fetch/expiry _strategies_, before
   * re-starting after the fetch. However, it will *not* cancel any running
   * fetches, given that there's a possibility of cancelling a fetch for an
   * unrelated id. Instead, it'll queue the fetch to be run after any existing
   * fetches.
   *
   * Returns a function that lets you abort the fetch.
   */
  fetch(): () => void

  /**
   * Instructs the resource to keep this key's state, even when there is no
   * active subscription.
   *
   * Note that holding a key will not actively fetch its contents. Also, note
   * that holds are specific to a resource instance -- they are not
   * serializable, and thus cannot be hydrated via the network or local storage.
   *
   * Returns a function to cancel the hold.
   */
  hold(): () => void

  /**
   * Pauses automatic fetches/expiries/purges until the returned unpause
   * function is called.
   */
  pause(): () => void

  predictDelete(): [
    () => void, // commit
    () => void, // discard
  ]

  /**
   * Indicate that you expect the data for this key to change in the near
   * future.
   *
   * This sets the `pending` indicator to `true`, and if an updater is provided,
   * sets a temporary value for `data` from until the returned resolve or reject
   * functions are called.
   *
   * If `commit` is called, the update will be applied to the store's state at
   * the time that it is called-- along with any further updates passed to
   * commit.  If `discard` is called, the prediction will be simply discarded.
   */
  predictUpdate(
    updater?: Data | ResourceUpdateCallback<Data, Key>,
  ): [
    (updater?: Data | ResourceUpdateCallback<Data, Key>) => void, // commit
    () => void, // discard
  ]

  /**
   * Stores the given data. If there is no subscription for it, then the data
   * will be immediately scheduled for purge.
   *
   * In the case a function is given, if this key has a value, then the updater
   * callback will be called and the returned value will be set as set as the
   * current data. If the key is empty or does not yet have any initial data,
   * then an error will be thrown.
   *
   * This will not change the `pending` status of your data, as `pending`
   * reflects any in-progress operations -- and updates will not affect these.
   * However, this *will* clear the `failedAttemptsSinceLastUpdate` counter.
   */
  update(dataOrUpdater: Data | ResourceUpdateCallback<Data, Key>): void
}

export interface ResourceKeyOptions<Data, Key, Selected> {
  path?: string[]

  /**
   * Lets you configure when a fetch strategy will be run while therer is an
   * active subscription.
   */
  requestPolicy?: ResourceRequestPolicy | null

  select?: ResourceKeySelector<Data, Key, Selected>
}

export type ResourceKeySelector<Data, Key, Selected> = (parts: {
  /**
   * When the active fetch strategy gives up and there are no more strategies
   * left in the queue, this flag will go true until another strategy is
   * manually started, or until a manual update adds data/removes the expired
   * flag.
   */
  abandoned: boolean

  data: Data
  /**
   * If false, indicates that the key doesn't exist; e.g. the server has
   * replied with a 404.
   */
  empty?: boolean
  /**
   * Indicates that there is no value, *and* we've abandoned fetching. You can
   * use this to avoid accessing the data property, and thus handle errors
   * without throwing an exeption.
   */
  error: boolean
  /**
   * Indicates that the data has been marked as out of date, and we've given
   * up trying to fetch any more. This will *not* be true if `pending` is
   * true -- even if the state is marked as `expired`.
   */
  expired?: number
  forbidden?: boolean
  key: Key
  /**
   * If true, indicates that we have in-progress predictions, or that the
   * fetch strategy is currently working.
   */
  pending: boolean
}) => Selected
