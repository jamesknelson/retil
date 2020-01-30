import { ResourceRequestPolicy } from './ResourcePolicies'
import { ResourceRef } from './ResourceRef'
import { ResourceSchema } from './ResourceSchema'
import { ResourceTask, ResourceTaskQueueType } from './ResourceTasks'
import { ResourceQuery } from './ResourceQuery'

export interface ResourceState<Schema extends ResourceSchema> {
  /**
   * If set, indicates that an unrecoverable exception has occured.
   */
  error?: any

  scopes: {
    [scope: string]: ResourceScopeState<Schema>
  }

  tasks: {
    nextId: number

    pausedBy: {
      [taskId: string]: ResourceRef<Schema>[]
    }

    /**
     * Holds all tasks that haven't yet been stopped.
     */
    pending: {
      [taskId: string]: ResourceTask<Schema>
    }

    /**
     * Holds a list of task ids which have had their states changed by the
     * reducer, but which haven't yet had that changed acknowledged by the
     * runner.
     *
     * - `start`: the task was added to `pending`, or removed from `pausedBy`
     * - `pause`: the task was added to `pausedBy`
     * - `stop`: the task was removed from pending (and possibly also pausedBy)
     */
    queue: {
      [taskId: string]: ResourceTaskQueueType
    }
  }
}

export type ResourceScopeState<Schema extends ResourceSchema> = {
  [Type in keyof Schema]: {
    [stringifiedId: string]: ResourceRefState<Schema, Type>
  }
}

export interface ResourceRefState<
  Schema extends ResourceSchema,
  Type extends keyof Schema = keyof Schema
> {
  modifiers: {
    /**
     * Specifies that the resource should be held in cache, even if there are
     * no active requests or tasks.
     */
    keep: number

    /**
     * Keeps track of whether automatically scheduled load tasks are currently
     * paused.
     */
    pause: number

    /**
     * Specifies that the resource should be considered to be pending. Prevents
     * new load tasks from starting, without cancelling existing ones. Also may
     * affect query results.
     */
    pending: number
  }

  /**
   * If this is true, indicates that the current state may no longer be up to
   * date with the canonical copy.
   */
  invalidated?: boolean

  /**
   * The document's primary key.
   */
  ref: ResourceRef<Schema, Type>

  request: null | {
    query: ResourceQuery<any, Schema>
    policies: {
      [Policy in ResourceRequestPolicy]: number
    }
  }

  /**
   * Keeps track of any running or paused tasks for this key.
   */
  tasks: {
    invalidate: null | string | false
    load: null | string | false
    manualLoad: null | string
    purge: null | string
    subscribe: null | string | false
  }

  /**
   * Stores the latest data or rejection associated with this key.
   */
  value: ResourceRefValue<Schema, Type>
}

export type ResourceRefValue<
  Schema extends ResourceSchema,
  Type extends keyof Schema
> =
  | { type: 'data'; data: Schema[Type][0]; timestamp: number }
  | { type: 'rejection'; rejection: Schema[Type][1]; timestamp: number }
