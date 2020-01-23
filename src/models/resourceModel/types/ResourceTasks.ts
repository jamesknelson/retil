import { ResourceDocState } from './ResourceState'
import { ResourceQuery } from './ResourceQuery'
import { ResourceRef } from './ResourceRef'
import { ResourceDataUpdate } from './ResourceValue'

export type ResourceInvalidator<
  Props extends object,
  Data,
  Rejection = string,
  Id = string
> = (options: {
  props: Props
  states: ResourceDocState<Data, Rejection, Id>[]
  /**
   * Invalidate the specified keys. Note, this cannot be done synchronously
   * with the function call; you'll want to wait some time before invalidating
   * anything.
   */
  invalidate: (refs?: ResourceRef<Id>[]) => void
}) => () => void

export type ResourceLoader<
  Props extends object,
  Data,
  Rejection = string,
  Id = string
> = (options: {
  props: Props
  query: ResourceQuery<Id>
  signal: AbortSignal

  /**
   * Abandoning a load will leave the queries docs as-is in an expired state,
   * and will also prevent any further loads from being scheduled without a
   * further update.
   */
  abandon: () => void
  /**
   * Put the resource into an unrecoverable error state. Where possible, prefer
   * to use `setRejection` instead -- as rejections can be recovered from.
   */
  error: (error: any) => void
  setData: (
    updates:
      | ((data: Data | undefined, id: Id, type: string) => Data)
      | (readonly [string, Id, ResourceDataUpdate<Data, Id>])[],
  ) => void
  /**
   * Allows you to mark the reason that the server did not provide data for a
   * requested key, e.g. it's not found (404), forbidden (403), etc.
   */
  setRejection: (
    rejections:
      | ((id: Id, type: string) => Rejection)
      | (readonly [string, Id, Rejection])[],
  ) => void
}) => void | undefined | (() => void)

/**
 * Specify when to purge keys.
 */
export type ResourcePurger<
  Props extends object,
  Data,
  Rejection,
  Id = string
> = (options: {
  props: Props
  states: ResourceDocState<Data, Rejection, Id>[]
  /**
   * Remove the specified keys and their data from the store.
   */
  purge: (refs?: ResourceRef<Id>[]) => void
}) => () => void

export type ResourceSubscriber<
  Props extends object,
  Data,
  Rejection = string,
  Id = string
> = (options: {
  props: Props
  query: ResourceQuery<Id>
  // Signal is provided so that a fetch strategy can be used in place of a
  // subscribe strategy on the server.
  signal: undefined

  /**
   * Indicate that this task is no longer receiving updates for its query,
   * so it should again be invalidated as usual by the invalidator task.
   */
  abandon: () => void
  /**
   * Put the resource into an unrecoverable error state. Where possible, prefer
   * to use `setRejection` instead -- as rejections can be recovered from.
   */
  error: (error: any) => void

  setData: (
    updates:
      | ((data: Data | undefined, id: Id, type: string) => Data)
      | (readonly [string, Id, ResourceDataUpdate<Data, Id>])[],
  ) => void
  /**
   * Allows you to mark the reason that the server did not provide data for a
   * requested key, e.g. it's not found (404), forbidden (403), etc.
   */
  setRejection: (
    rejections:
      | ((id: Id, type: string) => Rejection)
      | (readonly [string, Id, Rejection])[],
  ) => void
}) => () => void

export interface ResourceTaskConfig<Props extends object, Data, Rejection, Id> {
  invalidate: ResourceInvalidator<Props, Data, Rejection, Id> | null
  load: ResourceLoader<Props, Data, Rejection, Id> | null
  purge: ResourcePurger<Props, Data, Rejection, Id> | null
  subscribe: ResourceSubscriber<Props, Data, Rejection, Id> | null
}

export type ResourceTaskQueueType = 'start' | 'pause' | 'stop'

export interface ResourceCacheTask<Props extends object, Data, Rejection, Id> {
  type: 'invalidate' | 'purge'
  props: Props
  refs: ResourceRef<Id>[]
  scope: string
  taskId: string
  states: ResourceDocState<Data, Rejection, Id>[]
}

export interface ResourceNetworkTask<Props extends object, Id> {
  type: 'load' | 'manualLoad' | 'subscribe'
  props: Props
  refs: ResourceRef<Id>[]
  scope: string
  taskId: string
  query: ResourceQuery<Id>
}

export type ResourceTask<Props extends object, Data, Rejection, Id> =
  | ResourceCacheTask<Props, Data, Rejection, Id>
  | ResourceNetworkTask<Props, Id>

export type ResourceTaskType = ResourceTask<any, any, any, any>['type']
