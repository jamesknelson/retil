import { Dispose } from 'store'

import { ResourceRequestPolicy } from './ResourceRequestPolicy'
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
  | HoldAction<Key>
  | InvalidateAction<Key>
  | ManualLoadAction<Key>
  | PauseAction<Key>
  | PurgeAction<Key>
  | ReleaseHoldAction<Key>
  | ResumePause<Key>
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
 * Mark that the given keys should not be purged until the hold is released.
 * Optionally can apply request policies, which specify the conditions under
 * which tasks should be enqueued to request the key's data.
 */
type HoldAction<Key> = {
  type: 'hold'
  context: any
  path: string
  keys: Key[]
  requestPolicies?: ResourceRequestPolicy[]
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
 * Cancel all tasks for the given keys, re-scheduling them to be run again on a
 * corresponding resume action.
 */
type PauseAction<Key> = {
  type: 'pause'
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
type ReleaseHoldAction<Key> = {
  type: 'releaseHold'
  context: any
  path: string
  keys: Key[]
  // extra policy types:
  // - hold (i.e. don't purge, do invalidate unless paused)
  // - pauseInvalidation
  // - pauseLoad
  requestPolicies?: ResourceRequestPolicy[]
}

/**
 * Negate the affects of a corresponding hold action.
 */
type ResumePause<Key> = {
  type: 'resumePause'
  context: any
  path: string
  keys: Key[]
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
