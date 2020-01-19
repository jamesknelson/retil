import { Outlet } from '../../../outlets'

import { ResourceEffectCallback } from './ResourceEffects'
import { ResourceRequestPolicy } from './ResourcePolicies'
import { ResourceKeyState } from './ResourceState'
import {
  ResourceInvalidator,
  ResourceLoader,
  ResourcePurger,
  ResourceSubscriber,
} from './ResourceTasks'
import { ResourceDataUpdate } from './ResourceValue'

export type ResourceContext = {
  fetchOptions?: RequestInit
}

export interface Resource<Data, Key> {
  /**
   * Return an outlet and controller for the specified key, from which you can
   * get the latest value, or imperatively make changes.
   */
  key(
    query: Key,
    options?: ResourceKeyOptions<Data, Key>,
  ): readonly [Outlet<ResourceKey<Data, Key>>, ResourceKeyController<Data, Key>]

  // TODO
  // /**
  //  * Return a handle for an array of keys, from which you can get
  //  * and subscribe to multiple values at once.
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

export interface ResourceKey<Data, Key> {
  /**
   * Returns true if there's no value, and we're no longer looking for one.
   */
  abandoned: boolean

  data: Data

  /**
   * If there's data that can be accessed, this will be true.
   */
  hasData?: boolean

  /**
   * If true, indicates that instead of the expected data, this key has been
   * marked with a reason that the data wasn't erturned. This can be used to
   * indicate that resource was not found, was forbidden, etc.
   */
  hasRejection?: boolean

  key: Key

  /**
   * When true, indicates that we're expecting to receive new data due to an
   * in-progress operation.
   */
  pending: boolean

  /**
   * Indicates that we're still waiting on an initial value.
   */
  primed: boolean

  /**
   * Indicates that the data has been marked as possibly out of date, and in
   * need of a reload.
   */
  invalidated?: boolean

  rejection?: string

  state: ResourceKeyState<Data, Key>
}

export interface ResourceKeyController<Data, Key> {
  /**
   * Marks this key's currently stored state as stale.
   *
   * If there's an active `loadInvalidated` request policy, then a new load will
   * be automatically started. This should happen by default when a component is
   * subscribed to this key or when an outlet is waiting on a value via
   * `getValue()`.
   *
   */
  invalidate(): void

  /**
   * Marks that this resource's state should not be purged.
   *
   * Note that calling `keep` on a key will *not* actively fetch its contents --
   * even if there is an active `loadInvalidated` policy.
   *
   * Returns a function that releases this hold on the resource.
   */
  keep(): () => void

  /**
   * Imperatively schedule a load, even if paused or if the data already exists.
   * This will cancel any other running loaders.
   *
   * Returns a function that lets you abort the fetch.
   */
  load(): () => void

  /**
   * Pauses automatic loads until the returned resume function is called.
   * If `true` is passed as an argument, then the resource will be set to
   * pending for the duration of the pause.
   *
   * Returns a function to resume automatic fetches.
   */
  pause(expectingExternalUpdate?: boolean): () => void

  /**
   * Stores the given data, or if a function is given, runs the given update
   * on the current stored value.
   *
   * If the data is not in use, and has not had `keep()` called on it, then the
   * resource will be immediately scheduled for purge.
   */
  setData(dataOrUpdater: ResourceDataUpdate<Data, Key>): void

  /**
   * Marks the key as having no data for a specific reason, e.g. because it
   * was not found (404) or forbidden (403).
   */
  setRejection(reason: string): void
}

export interface ResourceKeyOptions<Data, Key> {
  /**
   * Configures which tasks will be automatically scheduled, and when. Options
   * include:
   *
   * - `loadInvalidated`, which loads data marked as invalidated
   * - `loadOnce`, which loads the first time the data is required
   * - `subscribe`, which creates a subscribe task to receive updates over a
   *   websocket or other communication mechanism.
   *
   * The default value depends on the environment in which the resource is
   * running in:
   *
   * - The browser defaults to `loadInvalidated`
   * - The server defaults to `loadOnce`
   */
  requestPolicy?: ResourceRequestPolicy | null
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
   * that different contexts will be keyed to different paths.
   */
  computePathForContext?: (context: Context) => string

  /**
   * Context that will be available to all model instances.
   */
  defaultContext?: Context

  /**
   * If provided, this will be called whenever the value changes. Then, if a
   * function is returned, it will be called after the value changes again,
   * or after the data is purged.
   *
   * Use this function to perform side effects based on the currently stored
   * value. This should feel familiar if you've used React's `useEffect` hook.
   *
   * For example, if this model contains lists of foreign keys, you could create
   * an effect to `keep()` those keys within another model. Similarly, if this
   * model contains items that are indexed in another model, you could use an
   * effect to expire indexes as the indexed items change.
   */
  effect?: ResourceEffectCallback<Data, Key, Context>

  /**
   * The task to run to invalidate newly received records.
   *
   * By default, expires after an hour on the client, and does not expire on
   * the server.
   */
  invalidator?: ResourceInvalidator<Data, Key, Context>

  /**
   * The task to run to load data for records.
   */
  loader?: null | ResourceLoader<Data, Key, Context>

  /**
   * A key unique to this resource model, allowing multiple models to be stored
   * in the same Store.
   *
   * This option is required if you pass an external `store` property via
   * context.
   */
  namespace?: string

  /**
   * Configures how to purge data that is no longer in use.
   *
   * If a number is given, data will be purged that many milliseconds after the
   * last hold is released.
   *
   * By default, data is purged after a minute in the browser, and is not purged
   * at all on the server.
   */
  purger?: null | number | ResourcePurger<Data, Key, Context>

  requestPolicy?: ResourceRequestPolicy | null

  subscriber?: null | ResourceSubscriber<Data, Key, Context>
}
