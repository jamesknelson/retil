import { ResourceQuery } from './ResourceQuery'
import { ResourceRef } from './ResourceRef'
import { ResourceRefState } from './ResourceState'

export type ResourceInvalidator<Data, Rejection = string> = (options: {
  states: ResourceRefState<Data, Rejection>[]
  /**
   * Invalidate the specified keys. Note, this cannot be done synchronously
   * with the function call; you'll want to wait some time before invalidating
   * anything.
   */
  invalidate: (ref?: ResourceRef[]) => void
}) => () => void

/**
 * Specify when to purge keys.
 */
export type ResourcePurger<Data, Rejection = string> = (options: {
  states: ResourceRefState<Data, Rejection>[]
  /**
   * Remove the specified keys and their data from the store.
   */
  purge: (refs?: ResourceRef[]) => void
}) => () => void

export interface ResourceTaskConfig<Data, Rejection> {
  invalidate: ResourceInvalidator<Data, Rejection> | null
  purge: ResourcePurger<Data, Rejection> | null
}

export type ResourceTaskQueueType = 'start' | 'pause' | 'stop'

export interface ResourceCacheTask<Data, Rejection> {
  type: 'invalidate' | 'purge'
  refs: ResourceRef[]
  scope: string
  states: ResourceRefState<Data, Rejection>[]
  taskId: string
}

export interface ResourceRequestTask<Data, Rejection> {
  type: 'load' | 'manualLoad' | 'subscribe'
  refs: ResourceRef[]
  query: ResourceQuery<any, Data, Rejection>
  scope: string
  taskId: string
}

export type ResourceTask<Data, Rejection> =
  | ResourceCacheTask<Data, Rejection>
  | ResourceRequestTask<Data, Rejection>

export type ResourceTaskType = ResourceTask<any, any>['type']
