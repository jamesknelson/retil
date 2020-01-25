import { ResourceRequestPolicy } from './ResourcePolicies'
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
