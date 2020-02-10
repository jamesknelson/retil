import { CachePointerState } from './cacheReducerState'
import { Pointer, PointerList } from './pointer'
import { ResourceRequest } from './resource'

export type ResourceInvalidator = (options: {
  states: CachePointerState[]
  /**
   * Invalidate the specified keys. Note, this cannot be done synchronously
   * with the function call; you'll want to wait some time before invalidating
   * anything.
   */
  invalidate: (pointer: PointerList) => void
}) => () => void

/**
 * Specify when to purge keys.
 */
export type ResourcePurger = (options: {
  states: CachePointerState[]
  /**
   * Remove the specified keys and their data from the store.
   */
  purge: (refs?: Pointer[]) => void
}) => () => void

export interface ResourceTaskConfig {
  invalidate: ResourceInvalidator | null
  purge: ResourcePurger | null
}

export type ResourceTaskQueueType = 'start' | 'pause' | 'stop'

export interface ResourceCacheTask {
  type: 'invalidate' | 'purge'
  pointers: Pointer[]
  scope: string
  states: CachePointerState[]
  taskId: string
}

export interface ResourceRequestTask {
  type: 'load' | 'manualLoad' | 'subscribe'
  pointers: Pointer[]
  request: ResourceRequest
  scope: string
  taskId: string
}

export type ResourceTask = ResourceCacheTask | ResourceRequestTask

export type ResourceTaskType = ResourceTask['type']
