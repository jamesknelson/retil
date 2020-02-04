import { ResourceQuery } from './ResourceQuery'
import { ResourceRef } from './ResourceRef'
import { ResourceSchema } from './ResourceSchema'
import { ResourceRefState } from './ResourceState'

export type ResourceInvalidator<Schema extends ResourceSchema> = (options: {
  states: ResourceRefState<Schema>[]
  /**
   * Invalidate the specified keys. Note, this cannot be done synchronously
   * with the function call; you'll want to wait some time before invalidating
   * anything.
   */
  invalidate: (ref?: ResourceRef<keyof Schema>[]) => void
}) => () => void

/**
 * Specify when to purge keys.
 */
export type ResourcePurger<Schema extends ResourceSchema> = (options: {
  states: ResourceRefState<Schema>[]
  /**
   * Remove the specified keys and their data from the store.
   */
  purge: (refs?: ResourceRef<keyof Schema>[]) => void
}) => () => void

export interface ResourceTaskConfig<Schema extends ResourceSchema> {
  invalidate: ResourceInvalidator<Schema> | null
  purge: ResourcePurger<Schema> | null
}

export type ResourceTaskQueueType = 'start' | 'pause' | 'stop'

export interface ResourceCacheTask<Schema extends ResourceSchema> {
  type: 'invalidate' | 'purge'
  refs: ResourceRef<keyof Schema>[]
  scope: string
  states: ResourceRefState<Schema>[]
  taskId: string
}

export interface ResourceRequestTask<Schema extends ResourceSchema> {
  type: 'load' | 'manualLoad' | 'subscribe'
  refs: ResourceRef<keyof Schema>[]
  query: ResourceQuery<any, Schema>
  scope: string
  taskId: string
}

export type ResourceTask<Schema extends ResourceSchema> =
  | ResourceCacheTask<Schema>
  | ResourceRequestTask<Schema>

export type ResourceTaskType = ResourceTask<any>['type']
