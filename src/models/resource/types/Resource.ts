import { Outlet } from 'outlets'
import { Store } from 'store'

import { ResourceEffectCallback } from './ResourceEffects'
import { ResourceRequestPolicy } from './ResourceRequestPolicy'
import { ResourceKeyState, ResourceState } from './ResourceState'
import {
  ResourceExpireStrategy,
  ResourceLoadStrategy,
  ResourcePurgeStrategy,
  ResourceSubscribeStrategy,
} from './ResourceTasks'
import { ResourceUpdateCallback } from './ResourceUpdate'

export type ResourceContext = {
  fetchOptions?: RequestInit
  store?: Store
}

export interface ResourceOptions<Data, Key, Context extends ResourceContext> {
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
  computePathForContext?: (context: Context) => string

  /**
   * Context that will be available to all model instances.
   */
  context?: Context

  /**
   * If provided, this will be called whenever the value changes. Then, if a
   * function is returned, it will be called after the value changes again,
   * or after the data is purged.
   *
   * Use this function to perform side effects based on the currently stored
   * value.
   *
   * For example, if this model contains lists of foreign keys, you could create
   * an effect to `hold()` those keys within another model. Similarly, if this
   * model contains items that are indexed in another model, you could use an
   * effect to expire indexes as the indexed items change.
   */
  effect?: ResourceEffectCallback<Data, Key, Context>

  /**
   * Strategy to run when we have up to date data. Can expire the data after
   * some amount of time to re-fetch it.
   *
   * By default, expires after an hour on the client, and does not expire on
   * the server.
   */
  expirer?: null | number | ResourceExpireStrategy<Data, Key, Context>

  /**
   * Configures how to upate data once there are active subscriptions. This will
   * be called for any keys with subscriptions, and with missing or stale data.
   * It will *not* be called for keys that have holds but no subscriptions.
   *
   * The strategy can also return a function that will be called should the
   * resource decide that a load is no longer needed - allowing the strategy to
   * free up any resources being used.
   */
  loader?: null | ResourceLoadStrategy<Data, Key, Context>

  /**
   * The namespace to use in the app store.
   */
  namespace?: string

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
   *
   * By default, purges after a minute on the client, or does not purge on the
   * server.
   */
  purger?: null | number | ResourcePurgeStrategy<Data, Key, Context>

  requestPolicy?: ResourceRequestPolicy | null

  subscriber?: null | ResourceSubscribeStrategy<Data, Key, Context>
}

export interface Resource<Data, Key> {
  // TODO
  // dehydrate(): Promise<ResourceState<Data, Key> | undefined>

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
  key(
    query: Key,
    options?: ResourceKeyOptions<Data, Key>,
  ): Readonly<
    [Outlet<ResourceKeyOutput<Data, Key>>, ResourceKeyController<Data, Key>]
  >

  // TODO
  // /**
  //  * Return a handle for an array of keys, from which you can get
  //  * and subscribe to multiple values at once.
  //  *
  //  * An error in any key will cause an error, while pending/missing values
  //  * on any key will cause a promise to be thrown.
  //  */
  // keys<Selected = DefaultSelected>(
  //   keys: Key[],
  //   options?: ResourceKeyOptions<Data, Key, Selected>,
  // ): Readonly<[Outlet<Selected[]>, ResourceKeyController<Data[], Key[]>]>

  /**
   * Return a list of the keys currently stored in the model for the given
   * path.
   */
  knownKeys(): Key[]

  withPath(path: string): Resource<Data, Key>
}

export interface ResourceKeyController<Data, Key> {
  /**
   * Marks the key as no longer existing.
   */
  delete(): void

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
  load(): () => void

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
   * Marks this key's currently stored state as stale.
   *
   * If there's an active subscription, a new version of the data will be
   * fetched if possible.
   */
  revalidate(): void

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

export interface ResourceKeyOptions<Data, Key> {
  /**
   * Lets you configure when a fetch strategy will be run while therer is an
   * active subscription.
   */
  requestPolicy?: ResourceRequestPolicy | null
}

export interface ResourceKeyOutput<Data, Key> {
  /**
   * Returns true if there's no value, and we're no longer looking for one.
   */
  abandoned: boolean

  data: Data
  /**
   * If true, indicates that the server returned a well formed response
   * indicating that there's no data (at least that we can view.)
   */
  inaccessible?: boolean
  inaccessibleReason?: any
  /**
   * If there's data that can be accessed, this will be true.
   */
  hasData?: boolean
  key: Key
  /**
   * If true, indicates one of:
   *
   * - we have an in-progress fetch
   * - we have unresolved predictions
   * - or we're waiting on the initial data, and still think that some data
   *   could come back due to an active subscription, or the subscripiton
   *   being paused.
   */
  pending: boolean
  /**
   * Indicates that the subscription is pending, *and* we haven't yet
   * received an initial value.
   */
  priming: boolean
  /**
   * Indicates that the data has been marked as out of date, and we've given
   * up trying to fetch any more. This will *not* be true if `pending` is
   * true -- even if the state is marked as `stale`.
   */
  stale?: boolean
  /**
   * Contains the raw state for this key.
   */
  state: ResourceKeyState<Data, Key>
}
