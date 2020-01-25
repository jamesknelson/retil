import { Dispose } from '../../../store'

import {
  ResourceModifierPolicy,
  ResourceRequestPolicy,
} from './ResourcePolicies'
import { ResourceQuery } from './ResourceQuery'
import { ResourceRef } from './ResourceRef'
import { ResourceValueUpdate } from './ResourceValue'

type NarrowAction<T, N> = T extends { type: N } ? T : never

// Utility for getting a specific action type's object
export type ResourceActionOfType<
  Data,
  Rejection,
  Type extends ResourceAction<Data, Rejection>['type']
> = NarrowAction<ResourceAction<Data, Rejection>, Type>

export type ResourceAction<Data, Rejection> =
  | { type: Dispose }
  | AbandonTask
  | ClearQueueAction
  | ErrorAction
  | HoldRequestPoliciesAction
  | HoldModifierPoliciesAction
  | InvalidateAction
  | ManualLoadAction
  | PurgeAction
  | ReleaseRequestPoliciesAction
  | ReleaseModifierPoliciesAction
  | UpdateValueAction<Data, Rejection>

/**
 * Mark that the given the given task can be stopped, and should not be
 * automatically started again for its associated docs.
 */
type AbandonTask = {
  type: 'abandonTask'
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
type HoldRequestPoliciesAction = {
  type: 'holdRequestPolicies'
  scope: string
  policies: ResourceRequestPolicy[]
  query: ResourceQuery
}

/**
 * Tag the given keys with policies that affect whcih tasks will be scheduled.
 */
type HoldModifierPoliciesAction = {
  type: 'holdModifierPolicies'
  scope: string
  policies: ResourceModifierPolicy[]
  refs: ResourceRef[]
}

/**
 * Set the specified keys to invalidated.
 */
type InvalidateAction = {
  type: 'invalidate'
  scope?: string
  refs: ResourceRef[]
  taskId: string | null
}

/**
 * Force the resource to load data, cancelling any other loads
 * in the process (including any previous forced load).
 */
type ManualLoadAction = {
  type: 'manualLoad'
  scope: string
  query: ResourceQuery
}

/**
 * Remove the given keys from the store, stoppping any associated tasks.
 */
type PurgeAction = {
  type: 'purge'
  refs: ResourceRef[]
  taskId: string
}

/**
 * Negate the affects of a corresponding hold action.
 */
type ReleaseRequestPoliciesAction = {
  type: 'releaseRequestPolicies'
  scope: string
  policies: ResourceRequestPolicy[]
  // Nothing but the list of refs is used here, but the action accepts a query
  // to be symmetric with HoldPoliciesAction.
  query: ResourceQuery
}

/**
 * Negate the affects of a corresponding hold action.
 */
type ReleaseModifierPoliciesAction = {
  type: 'releaseModifierPolicies'
  scope: string
  policies: ResourceModifierPolicy[]
  refs: ResourceRef[]
}

/**
 * Updates stored values.
 */
type UpdateValueAction<Data, Rejection> = {
  type: 'updateValue'
  scope?: string
  taskId: string | null
  timestamp: number
  updates: (readonly [
    string,
    string | number,
    ResourceValueUpdate<Data, Rejection>,
  ])[]
}
