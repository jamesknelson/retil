import { Dispose } from '../../../store'

import { ResourceRequestPolicy } from './ResourcePolicies'
import { ResourceQuery } from './ResourceQuery'
import { ResourceRef } from './ResourceRef'
import { ResourceSchema } from './ResourceSchema'
import { ResourceUpdate } from './ResourceUpdates'

type NarrowAction<T, N> = T extends { type: N } ? T : never

// Utility for getting a specific action type's object
export type ResourceActionOfType<
  Schema extends ResourceSchema,
  Type extends ResourceAction<Schema>['type']
> = NarrowAction<ResourceAction<Schema>, Type>

export type ResourceAction<Schema extends ResourceSchema> =
  | { type: Dispose }
  | AbandonTask
  | ApplyModifiersAction
  | ClearQueueAction
  | DropQueryAction
  | ErrorAction
  | InvalidateAction
  | ManualLoadAction
  | PurgeAction
  | RegisterQueryAction
  | UpdateValueAction<Schema>

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
  refs: ResourceRef<any>[]

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
type DropQueryAction = {
  type: 'dropQuery'
  scope: string
  requestPolicies: ResourceRequestPolicy[]
  query: ResourceQuery
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
  refs: ResourceRef<any>[]
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
  refs: ResourceRef<any>[]
  taskId: string
}

/**
 * Tag the given keys with policies that affect which tasks will be scheduled.
 */
type RegisterQueryAction = {
  type: 'registerQuery'
  scope: string
  requestPolicies: ResourceRequestPolicy[]
  query: ResourceQuery
}

/**
 * Updates stored values.
 */
type UpdateValueAction<Schema extends ResourceSchema> = {
  type: 'updateValue'
  scope?: string
  taskId: string | null
  timestamp: number
  updates: ResourceUpdate<Schema, keyof Schema>[]
}
