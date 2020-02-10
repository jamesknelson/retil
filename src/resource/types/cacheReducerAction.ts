import { Dispose } from '../../store'
import { NarrowByType } from '../../utils/types'

import { ChunkList } from './chunk'
import { PointerList } from './pointer'
import { ResourceRequestPolicy } from './requestPolicy'
import { ResourceRequest } from './resource'

// Utility for getting a specific action type's object
export type ResourceActionOfType<
  Type extends CacheReducerAction['type']
> = NarrowByType<CacheReducerAction, Type>

export type CacheReducerAction =
  | { type: Dispose }
  | AbandonTask
  | ApplyModifiersAction
  | ClearQueueAction
  | DropRequestAction
  | ErrorAction
  | InvalidateAction
  | ManualLoadAction
  | PurgeAction
  | RegisterRequestAction
  | UpdateValueAction

/**
 * Mark that the given the given task can be stopped, and should not be
 * automatically started again for its associated docs.
 */
type AbandonTask = {
  type: 'abandonTask'
  taskId: string
}

/**
 * Tag the given keys with modifiers that affect the behavior of the cache,
 * tasks and queries.
 */
type ApplyModifiersAction = {
  type: 'applyModifiers'
  scope: string
  pointers: PointerList

  keep?: number
  pause?: number
  pending?: number
}

/**
 * Handles notification from the task runner that the queue has been processed.
 */
type ClearQueueAction = {
  type: 'clearQueue'
}

/**
 * Negate the affects of a corresponding hold action.
 */
type DropRequestAction = {
  type: 'dropRequest'
  scope: string
  policies: ResourceRequestPolicy[]
  request: ResourceRequest
}

/**
 * Puts the entire resource into error mode. *This should never happen.*
 */
type ErrorAction = {
  type: 'error'
  error: any
}

/**
 * Set the specified keys to invalidated.
 */
type InvalidateAction = {
  type: 'invalidate'
  scope?: string
  pointers: PointerList
  taskId: string | null
}

/**
 * Force the resource to load data, cancelling any other loads
 * in the process (including any previous forced load).
 */
type ManualLoadAction = {
  type: 'manualLoad'
  scope: string
  request: ResourceRequest
}

/**
 * Remove the given keys from the store, stoppping any associated tasks.
 */
type PurgeAction = {
  type: 'purge'
  pointers: PointerList
  taskId: string
}

/**
 * Tag the given keys with policies that affect which tasks will be scheduled.
 */
type RegisterRequestAction = {
  type: 'registerRequest'
  scope: string
  policies: ResourceRequestPolicy[]
  request: ResourceRequest
}

/**
 * Updates stored values.
 */
type UpdateValueAction = {
  type: 'updateValue'
  scope?: string
  taskId: string | null
  timestamp: number
  chunks: ChunkList
}
