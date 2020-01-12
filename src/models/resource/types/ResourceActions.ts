import { ResourcePrediction } from './ResourcePredicton'
import { ResourceRequestPolicy } from './ResourceRequestPolicy'
import { ResourceUpdateCallback } from './ResourceUpdateCallback'
import { ResourceValue } from './ResourceValue'

export type ResourceAction<Data, Key> =
  | AbandonFetchAction<Key>
  | AbandonSubscribeAction<Key>
  | ErrorAction
  | ExpireAction<Key>
  | HoldAction<Key>
  | HoldWithPredictionAction<Data, Key>
  | HoldWithRequestPolicyAction<Key>
  | MarkAsEvergreenAction<Key>
  | HoldWithPauseAction<Key>
  | PurgeAction<Key>
  | ReleaseHoldAction<Key>
  | ReleaseHoldWithPredictionAction<Data, Key>
  | ReleaseHoldWithRequestPolicyAction<Key>
  | ReleaseHoldWithPauseAction<Key>
  | StartedTasksAction<Data, Key>
  | StoppedTasksAction<Data, Key>
  | UpdateAction<Data, Key>

/**
 * Mark that a fetch task will no longer try to fetch the specified keys.
 */
export type AbandonFetchAction<Key> = {
  type: 'abandonFetch'
  path: string[]
  keys: Key[]
  taskId: string
}

/**
 * Mark that a subscribe task will no longer receive updates for the specified
 * keys.
 */
export type AbandonSubscribeAction<Key> = {
  type: 'abandonSubscribe'
  path: string[]
  keys: Key[]
  taskId: string
}

/**
 * If any given `taskId` is still in the active task queue, this puts the entire
 * resource into error mode. *This should never happen.*
 */
export type ErrorAction = {
  type: 'error'
  error: any
  taskId: null | string
}

/**
 * Expire the specified keys.
 */
export type ExpireAction<Key> = {
  type: 'expire'
  context?: any
  path: string[]
  keys: Key[]
  taskId: string | null
}

/**
 * Mark that the given keys should not be purged until the hold is released.
 */
export type HoldAction<Key> = {
  type: 'hold'
  context: any
  path: string[]
  keys: Key[]
}

/**
 * Cancel all tasks for the given keys, re-scheduling them to be run again on a
 * corresponding resume action.
 */
export type HoldWithPauseAction<Key> = {
  type: 'holdWithPause'
  context: any
  path: string[]
  keys: Key[]
}

/**
 * Add predictions to each key.
 */
export type HoldWithPredictionAction<Data, Key> = {
  type: 'holdWithPrediction'
  context: any
  path: string[]
  keys: Key[]
  prediction: ResourcePrediction<Data, Key>
}

/**
 * Mark that the given keys should not be purged until the hold is released, and
 * further mark that tasks should be enqueued to request the key's data on the
 * given conditions.
 */
export type HoldWithRequestPolicyAction<Key> = {
  type: 'holdWithRequestPolicy'
  context: any
  path: string[]
  keys: Key[]
  requestPolicies: ResourceRequestPolicy[]
}

/**
 * Mark that the given keys' current values will not expire (unless manually
 * expired.)
 */
export type MarkAsEvergreenAction<Key> = {
  type: 'markAsEvergreen'
  path: string[]
  keys: Key[]
  taskId: string
}

/**
 * Remove the given keys from the store, stoppping any associated tasks.
 */
export type PurgeAction<Key> = {
  type: 'purge'
  path: string[]
  keys: Key[]
  taskId: string
}

/**
 * Negate the affects of a corresponding hold action.
 */
export type ReleaseHoldAction<Key> = {
  type: 'releaseHold'
  context: any
  path: string[]
  keys: Key[]
}

/**
 * Negate the effects of a corresponding pause action.
 */
export type ReleaseHoldWithPauseAction<Key> = {
  type: 'releaseHoldWithPause'
  context: any
  path: string[]
  keys: Key[]
}

/**
 * Remove the specified predictions, with the option of commiting them (or some
 * other data) to the store.
 */
export type ReleaseHoldWithPredictionAction<Data, Key> = {
  type: 'releaseHoldWithPrediction'
  context: any
  path: string[]
  keys: Key[]
  prediction: ResourcePrediction<Data, Key>
  timestamp: number
  updates: {
    key: Key
    value: ResourceValue<Data> | ResourceUpdateCallback<Data, Key>
    expired?: boolean
  }[]
}

/**
 * Negate the affects of a corresponding holdWithRequestPolicy action.
 */
export type ReleaseHoldWithRequestPolicyAction<Key> = {
  type: 'releaseHoldWithRequestPolicy'
  context: any
  path: string[]
  keys: Key[]
  requestPolicies: ResourceRequestPolicy[]
}

/**
 * Handle notification from the task runner that an enqueued task has started.
 */
export type StartedTasksAction<Data, Key> = {
  type: 'startedTasks'
  taskStoppers: {
    [taskId: string]: () => void
  }
}

/**
 * Handle notification from the task runner that a task has been stopped.
 */
export type StoppedTasksAction<Data, Key> = {
  type: 'stoppedTasks'
  taskIds: string[]
}

/**
 * Update cached data
 */
export type UpdateAction<Data, Key> = {
  type: 'update'
  context?: any
  path: string[]
  taskId: string | null
  timestamp: number
  updates: {
    key: Key
    value: ResourceValue<Data> | ResourceUpdateCallback<Data, Key>
    expired?: boolean
  }[]
}
