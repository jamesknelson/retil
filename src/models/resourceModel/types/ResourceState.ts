import { ResourceEffect } from './ResourceEffects'
import { ResourcePolicy } from './ResourcePolicies'
import { ResourceRef } from './ResourceRef'
import { ResourceTask, ResourceTaskQueueType } from './ResourceTasks'
import { ResourceValue } from './ResourceValue'

export interface ResourceState<Data, Rejection, Id> {
  effects: ResourceEffect<any, Data, Rejection, Id>[]

  /**
   * If set, indicates that an unrecoverable exception has occured.
   */
  error?: any

  scopes: {
    [scope: string]: ResourceScopeState<Data, Rejection, Id>
  }

  tasks: {
    nextId: number

    pausedBy: {
      // TODO:
      // can use string refKeys herer
      [taskId: string]: ResourceRef<Id>[]
    }

    /**
     * Holds all tasks that haven't yet been stopped.
     */
    pending: {
      [taskId: string]: ResourceTask<any, Data, Rejection, Id>
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

export type ResourceScopeState<Data, Rejection, Id> = {
  [refKey: string]: ResourceDocState<Data, Rejection, Id>
}

export interface ResourceDocState<Data, Rejection, Id> {
  /**
   * If this is true, indicates that the current state should no longer be
   * treated as current -- and thus should be revalidated with the server.
   */
  invalidated?: boolean

  /**
   * The document's primary key.
   */
  id: Id

  policies: {
    [Policy in ResourcePolicy]: number
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

  type: string

  /**
   * Stores the latest data or rejection associated with this key.
   */
  value: ResourceValue<Data, Rejection> | null
}
