import { Dispose } from '../../../store'

import { ResourcePolicy } from './ResourcePolicies'
import { ResourceQuery } from './ResourceQuery'
import { ResourceRef } from './ResourceRef'
import { ResourceValueUpdate } from './ResourceValue'

type NarrowAction<T, N> = T extends { type: N } ? T : never

// Utility for getting a specific action type's object
export type ResourceActionOfType<
  Data,
  Rejection,
  Id,
  Type extends ResourceAction<Data, Rejection, Id>['type']
> = NarrowAction<ResourceAction<Data, Rejection, Id>, Type>

export type ResourceAction<Data, Rejection, Id> =
  | { type: Dispose }
  | AbandonTask
  | ClearQueueAction
  | ErrorAction
  | HoldPoliciesAction<Id>
  | InvalidateAction<Id>
  | ManualLoadAction<Id>
  | PurgeAction<Id>
  | ReleasePoliciesAction<Id>
  | UpdateValueAction<Data, Rejection, Id>

/**
 * Mark that the given the given task can be stopped, and should not be
 * automatically started again for its associated docs.
 */
type AbandonTask = {
  type: 'abandonTask'
  scope: string
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
type HoldPoliciesAction<Id> = {
  type: 'holdPolicies'
  policies: ResourcePolicy[]
  props: any
  // This will be passed through to any created load tasks, without being
  // stored on the state.
  query: ResourceQuery<Id>
  scope: string
}

/**
 * Set the specified keys to invalidated.
 */
type InvalidateAction<Id> = {
  type: 'invalidate'
  props?: any
  scope: string
  refs: ResourceRef<Id>[]
  taskId: string | null
}

/**
 * Force the resource to load data, cancelling any other loads
 * in the process (including any previous forced load).
 */
type ManualLoadAction<Id> = {
  type: 'manualLoad'
  props: any
  // This will be passed through to any created load tasks, without being
  // stored on the state.
  query: ResourceQuery<Id>
  scope: string
}

/**
 * Remove the given keys from the store, stoppping any associated tasks.
 */
type PurgeAction<Id> = {
  type: 'purge'
  scope: string
  refs: ResourceRef<Id>[]
  taskId: string
}

/**
 * Negate the affects of a corresponding hold action.
 */
type ReleasePoliciesAction<Id> = {
  type: 'releasePolicies'
  policies: ResourcePolicy[]
  props: any
  // Nothing but the list of refs is used here, but the action accepts a query
  // to be symmetric with HoldPoliciesAction.
  query: ResourceQuery<Id>
  scope: string
}

/**
 * Updates stored values.
 */
type UpdateValueAction<Data, Rejection, Id> = {
  type: 'updateValue'
  taskId: string | null
  timestamp: number
  props?: any
  scope: string
  updates: (readonly [string, Id, ResourceValueUpdate<Data, Rejection, Id>])[]
}
