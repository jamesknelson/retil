import { Dispose } from 'store'

import { ResourcePrediction } from './ResourcePrediction'
import { ResourceRequestPolicy } from './ResourceRequestPolicy'
import { ResourceUpdate } from './ResourceUpdate'

type NarrowAction<T, N> = T extends { type: N } ? T : never

// Utility for getting the a specific type of action
export type ResourceActionOfType<
  Data,
  Key,
  Type extends ResourceAction<any, any>['type']
> = NarrowAction<ResourceAction<Data, Key>, Type>

export type ResourceAction<Data, Key> =
  | { type: Dispose }
  | AbandonLoadAction<Key>
  | AbandonSubscribeAction<Key>
  | AbortForceLoad<Key>
  | ClearQueueAction
  | ErrorAction
  | ExpireAction<Key>
  | ForceLoadAction<Key>
  | HoldAction<Key>
  | MarkAsEvergreenAction<Key>
  | PauseAction<Key>
  | PredictAction<Data, Key>
  | PurgeAction<Key>
  | ReleaseHoldAction<Key>
  | ResolvePredictionAction<Data, Key>
  | ResumePause<Key>
  | UpdateAction<Data, Key>

/**
 * Mark that a fetch task will no longer try to fetch the specified keys.
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
 * Abort a previously started force fetch.
 */
type AbortForceLoad<Key> = {
  type: 'abortForceLoad'
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
 * Expire the specified keys.
 */
type ExpireAction<Key> = {
  type: 'expire'
  context?: any
  path: string
  keys: Key[]
  taskId: string | null
}

/**
 * Force the resource to run the given fetch, cancelling any other fetches
 * in the process (including any previous force fetch).
 */
type ForceLoadAction<Key> = {
  type: 'forceLoad'
  context: any
  path: string
  keys: Key[]
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
 * Mark that the given keys' current values will not expire (unless manually
 * stale.)
 */
type MarkAsEvergreenAction<Key> = {
  type: 'markAsEvergreen'
  path: string
  keys: Key[]
  taskId: string
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
 * Add predictions to each key, applying a hold in the meantime.
 */
type PredictAction<Data, Key> = {
  type: 'predict'
  context: any
  path: string
  keys: Key[]
  prediction: ResourcePrediction<Data, Key>
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
  requestPolicies?: ResourceRequestPolicy[]
}

/**
 * Remove the specified predictions, with the option of commiting them (or some
 * other data) to the store.
 */
type ResolvePredictionAction<Data, Key> = {
  type: 'resolvePrediction'
  context: any
  path: string
  keys: Key[]
  prediction: ResourcePrediction<Data, Key>
  update?: ResourceUpdate<Data, Key>
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
type UpdateAction<Data, Key> = {
  type: 'update'
  context?: any
  path: string
  taskId: string | null
  update: ResourceUpdate<Data, Key>
}
