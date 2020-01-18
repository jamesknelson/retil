import { Dispose } from '../../../store'

import { ResourcePolicy } from './ResourcePolicies'
import { ResourceValueUpdate } from './ResourceValue'

type NarrowAction<T, N> = T extends { type: N } ? T : never

// Utility for getting a specific action type's object
export type ResourceActionOfType<
  Data,
  Key,
  Type extends ResourceAction<any, any>['type']
> = NarrowAction<ResourceAction<Data, Key>, Type>

export type ResourceAction<Data, Key> =
  | { type: Dispose }
  | AbandonTask<Key>
  | ClearQueueAction
  | ErrorAction
  | HoldPoliciesAction<Key>
  | InvalidateAction<Key>
  | ManualLoadAction<Key>
  | PurgeAction<Key>
  | ReleasePoliciesAction<Key>
  | UpdateValueAction<Data, Key>

/**
 * Mark that the given keys no longer should be affected by the given task.
 * If there are no more keys linked to the task, then the task will be stopped.
 */
type AbandonTask<Key> = {
  type: 'abandonTask'
  path: string
  keys: Key[]
  taskId: string
}

/**
 * Handles notification from the task runner that the queue has been processed.
 */
type ClearQueueAction = {
  type: 'clearQueue'
}

/**
 * Puts the entire resource into error mode. *This should never happen.*
 */
type ErrorAction = {
  type: 'error'
  error: any
}

/**
 * Tag the given keys with policies that affect whcih tasks will be scheduled.
 */
type HoldPoliciesAction<Key> = {
  type: 'holdPolicies'
  context: any
  path: string
  keys: Key[]
  policies: ResourcePolicy[]
}

/**
 * Set the specified keys to invalidated.
 */
type InvalidateAction<Key> = {
  type: 'invalidate'
  context?: any
  path: string
  keys: Key[]
  taskId: string | null
}

/**
 * Force the resource to load data, cancelling any other loads
 * in the process (including any previous forced load).
 */
type ManualLoadAction<Key> = {
  type: 'manualLoad'
  context: any
  path: string
  keys: Key[]
}

/**
 * Remove the given keys from the store, stoppping any associated tasks.
 */
type PurgeAction<Key> = {
  type: 'purge'
  path: string
  keys: Key[]
  taskId: string
}

/**
 * Negate the affects of a corresponding hold action.
 */
type ReleasePoliciesAction<Key> = {
  type: 'releasePolicies'
  context: any
  path: string
  keys: Key[]
  policies: ResourcePolicy[]
}

/**
 * Updates stored values.
 */
type UpdateValueAction<Data, Key> = {
  type: 'updateValue'
  context?: any
  taskId: string | null
  timestamp: number
  updates: {
    [path: string]: (readonly [Key, ResourceValueUpdate<Data, Key>])[]
  }
}
