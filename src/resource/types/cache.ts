import { Outlet } from '../../outlets'

import { ResourceRequestPolicy } from './requestPolicy'
import { Resource } from './resource'
import { Schematic } from './schematic'
import { ResourceInvalidator, ResourcePurger } from './tasks'

export interface ResourceCache<Context extends object = any> {
  /**
   * Return an outlet and controller for the specified key, from which you can
   * get the latest value, or imperatively make changes.
   */
  request<Data = any, Rejection = any, Vars = any>(
    resource: Resource<Data, Rejection, Vars, Context>,
    options?: ResourceRequestOptions<Vars>,
  ): [
    ResourceRequestSource<Data, Rejection, Vars>,
    ResourceRequestController<Rejection, any>,
  ]

  /**
   * Return an outlet and controller for the specified key, from which you can
   * get the latest value, or imperatively make changes.
   */
  request<Data = any, Rejection = any, Vars = any, Input = any>(
    resource: Resource<Data, Rejection, Vars, Context> &
      Schematic<any, any, Vars, Input>,
    options?: ResourceRequestOptions<Vars>,
  ): [
    ResourceRequestSource<Data, Rejection, Vars>,
    ResourceRequestController<Rejection, Input>,
  ]
}

export interface ResourceResult<Data, Rejection, Vars> {
  /**
   * Returns true if there's no value, and we're no longer looking for one.
   */
  abandoned: boolean

  data?: Data

  getData(): Data
  getRejection(): Rejection

  /**
   * If there's data that can be accessed, this will be true.
   */
  hasData: boolean

  /**
   * If true, indicates that instead of the expected data, this key has been
   * marked with a reason that the data wasn't erturned. This can be used to
   * indicate that resource was not found, was forbidden, etc.
   */
  hasRejection: boolean

  /**
   * Indicates that some of the data has been marked as possibly out of date,
   * and in need of a reload.
   */
  invalidated?: boolean

  id: string | number

  /**
   * When true, indicates that we're expecting to receive new data due to an
   * in-progress operation.
   */
  pending: boolean

  /**
   * Indicates that we're still waiting on an initial value.
   */
  primed: boolean

  rejection?: Rejection

  bucket: string

  vars: Vars
}

export type ResourceRequestSource<
  Data = any,
  Rejection = any,
  Vars = any
> = Outlet<ResourceResult<Data, Rejection, Vars>>

export interface ResourceRequestController<Rejection = any, Input = any> {
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
   * Marks that this request's state should not be purged.
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
  forceLoad(): () => void

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
  receive(input: Input): void

  /**
   * Marks the root ref as having no data for a specific reason, e.g. because they
   * were not found (404) or forbidden (403).
   */
  receiveRejection(rejection: Rejection): void
}

export interface ResourceRequestOptions<Vars = any> {
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
  policy?: ResourceRequestPolicy | null

  vars?: Vars
}

export interface CacheModelOptions<Context extends object> {
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
  defaultInvalidator?: ResourceInvalidator

  /**
   * Configures how to purge data that is no longer in use.
   *
   * If a number is given, data will be purged that many milliseconds after the
   * last hold is released.
   *
   * By default, data is purged after a minute in the browser, and is not purged
   * at all on the server.
   */
  defaultPurger?: null | number | ResourcePurger

  defaultRequestPolicy?: ResourceRequestPolicy | null

  /**
   * A key unique to this resource model, allowing multiple models to be stored
   * in the same Store.
   *
   * This option is required if you pass an external `store` property via
   * context.
   */
  namespace?: string
}
