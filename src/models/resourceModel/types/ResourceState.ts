import {
  ResourceModifierPolicy,
  ResourceRequestPolicy,
} from './ResourcePolicies'
import { ResourceRef } from './ResourceRef'
import { ResourceTask, ResourceTaskQueueType } from './ResourceTasks'
import { ResourceValue } from './ResourceValue'
import { ResourceQuery } from './ResourceQuery'

export interface ResourceState<Data, Rejection> {
  /**
   * If set, indicates that an unrecoverable exception has occured.
   */
  error?: any

  scopes: {
    [scope: string]: ResourceScopeState<Data, Rejection>
  }

  tasks: {
    nextId: number

    pausedBy: {
      [taskId: string]: ResourceRef[]
    }

    /**
     * Holds all tasks that haven't yet been stopped.
     */
    pending: {
      [taskId: string]: ResourceTask<Data, Rejection>
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

export type ResourceScopeState<Data, Rejection> = {
  [type: string]: {
    [stringifiedId: string]: ResourceRefState<Data, Rejection>
  }
}

export interface ResourceRefState<Data, Rejection> {
  /**
   * If this is true, indicates that the current state should no longer be
   * treated as current -- and thus should be revalidated with the server.
   */
  invalidated?: boolean

  modifierPolicies: {
    [Policy in ResourceModifierPolicy]: number
  }

  /**
   * The document's primary key.
   */
  ref: ResourceRef

  request: null | {
    query: ResourceQuery<any, Data, Rejection>
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
  value: ResourceValue<Data, Rejection> | null
}
