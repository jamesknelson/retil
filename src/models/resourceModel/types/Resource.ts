import { Outlet } from '../../../outlets'

import { ResourceRequestPolicy } from './ResourcePolicies'
import { ResourceQueryType } from './ResourceQuery'
import { ResourceRef } from './ResourceRef'
import { ResourceSchema } from './ResourceSchema'
import { ResourceRefState } from './ResourceState'
import { ResourceInvalidator, ResourcePurger } from './ResourceTasks'
import {
  ResourceDataUpdater,
  ResourceRejectionUpdater,
} from './ResourceUpdates'

export interface ResourceCache<
  Context extends object = any,
  Schema extends ResourceSchema = any
> {
  /**
   * Return an outlet and controller for the specified key, from which you can
   * get the latest value, or imperatively make changes.
   */
  query<Result, Variables>(
    type: ResourceQueryType<Result, Variables, Context, Schema>,
    options?: ResourceQueryOptions<Variables>,
  ): ResourceQueryOutlet<Result>

  /**
   * Return an outlet and controller for the specified key, from which you can
   * get the latest value, or imperatively make changes.
   */
  refs<Refs extends ResourceRef<Schema>[]>(
    refs: Refs,
  ): ResourceRefsOutlet<Schema, Refs>
}

export interface ResourceQueryOutlet<Result> extends Outlet<Result> {
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
   * Marks that this query's state should not be purged.
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
}

export interface ResourceRefsOutlet<
  Schema extends ResourceSchema,
  Refs extends ResourceRef<Schema>[]
>
  extends Outlet<
    {
      [Index in Extract<keyof Refs, number>]: ResourceRefState<
        Schema,
        Refs[Index][0]
      >
    }
  > {
  /**
   * Marks that this ref's state should not be purged.
   *
   * Returns a function that releases this hold on the resource.
   */
  keep(): () => void

  /**
   * Stores the given data, or if a function is given, runs the given update
   * on the current stored value.
   *
   * If the data is not in use, and has not had `keep()` called on it, then the
   * resource will be immediately scheduled for purge.
   */
  setData(dataOrUpdater: ResourceDataUpdater<Schema, keyof Schema>[]): void

  /**
   * Marks the refs as having no data for a specific reason, e.g. because they
   * were not found (404) or forbidden (403).
   */
  setRejection(reason: ResourceRejectionUpdater<Schema, keyof Schema>[]): void
}

export interface ResourceQueryOptions<Variables> {
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

  variables?: Variables
}

export interface ResourceOptions<
  Context extends object,
  Schema extends ResourceSchema
> {
  /**
   * An optional function for computing a secondary id based on props, so
   * that different sets of data can be stored for different sets of props.
   * This can come in handy for storing data for different user accounts.
   */
  getScope?: (context: Context) => string

  /**
   * Context that will be available to all model instances.
   */
  defaultContext?: Context

  /**
   * The task to run to invalidate newly received records.
   *
   * By default, expires after an hour on the client, and does not expire on
   * the server.
   */
  invalidator?: ResourceInvalidator<Schema>

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
  purger?: null | number | ResourcePurger<Schema>

  requestPolicy?: ResourceRequestPolicy | null
}
