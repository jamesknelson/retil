import { Dispose } from 'store'

import { ResourcePolicy } from './ResourcePolicies'
import { ResourceValueUpdate } from './ResourceValue'

type NarrowAction<T, N> = T extends { type: N } ? T : never

// Utility for getting the a specific type of action
export type ResourceActionOfType<
  Data,
  Key,
  Type extends ResourceAction<any, any>['type']
> = NarrowAction<ResourceAction<Data, Key>, Type>

export type ResourceAction<Data, Key> =
  | { type: Dispose }
  | AbandonInvalidationAction<Key>
  | AbandonLoadAction<Key>
  | AbandonSubscribeAction<Key>
  | AbortManualLoad<Key>
  | ClearQueueAction
  | ErrorAction
  | HoldPoliciesAction<Key>
  | InvalidateAction<Key>
  | ManualLoadAction<Key>
  | PurgeAction<Key>
  | ReleasePoliciesAction<Key>
  | UpdateValueAction<Data, Key>

/**
 * Mark that the given keys' current values will not expire (unless manually
 * stale.)
 */
type AbandonInvalidationAction<Key> = {
  type: 'abandonInvalidation'
  path: string
  keys: Key[]
  taskId: string
}

/**
 * Mark that a load task will no longer try to load the specified keys.
 */
type AbandonLoadAction<Key> = {
  type: 'abandonLoad'
  path: string
  keys: Key[]
  taskId: string
}

/**
 * Mark that a subscribe task will no longer receive updates for the specified
 * keys.
 */
type AbandonSubscribeAction<Key> = {
  type: 'abandonSubscribe'
  path: string
  keys: Key[]
  taskId: string
}

/**
 * Abort a previously started manual load.
 */
type AbortManualLoad<Key> = {
  type: 'abortManualLoad'
  path: string
  keys: Key[]
  taskId: string
}

/**
 * Handle notification from the task runner that the queue has been processed.
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
 * Tag the given keys with policies that affect the tasks that will be
 * scheduled.
 */
type HoldPoliciesAction<Key> = {
  type: 'holdPolicies'
  context: any
  path: string
  keys: Key[]
  policies: ResourcePolicy[]
}

/**
 * Expire the specified keys.
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
 * Update cached data
 */
type UpdateValueAction<Data, Key> = {
  type: 'updateValue'
  context?: any
  path: string
  taskId: string | null
  timestamp: number
  updates: (readonly [Key, ResourceValueUpdate<Data, Key>])[]
}
