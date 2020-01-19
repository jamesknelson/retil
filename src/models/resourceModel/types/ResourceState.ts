import { ResourceEffect } from './ResourceEffects'
import { ResourcePolicy } from './ResourcePolicies'
import {
  ResourceKeyTasks,
  ResourceTask,
  ResourceTaskQueueType,
} from './ResourceTasks'
import { ResourceValue } from './ResourceValue'

export interface ResourceState<Data, Key> {
  effects: ResourceEffect<Data, Key, any>[]

  /**
   * If set, indicates that an unrecoverable exception has occured.
   */
  error?: any

  records: {
    [pathPath: string]: {
      [keyHash: string]: ResourceKeyState<Data, Key>[]
    }
  }

  tasks: {
    nextId: number

    pausedBy: {
      [taskId: string]: Key[]
    }

    /**
     * Holds all tasks that haven't yet been stopped.
     */
    pending: {
      [taskId: string]: ResourceTask<Data, Key, any>
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

export interface ResourceKeyState<Data = any, Key = any> {
  /**
   * If this is true, indicates that the current state should no longer be
   * treated as current -- and thus should be revalidated with the server.
   */
  invalidated?: boolean

  /**
   * The document's primary key.
   */
  key: Key

  policies: {
    [Policy in ResourcePolicy]: number
  }

  /**
   * Keeps track of any running or paused tasks for this key.
   */
  tasks: ResourceKeyTasks

  /**
   * Stores the latest data or rejection associated with this key.
   */
  value: ResourceValue<Data> | null
}
