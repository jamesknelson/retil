import { Pointer } from './pointer'
import { ResourceRequestPolicy } from './requestPolicy'
import { ResourceTask, ResourceTaskQueueType } from './tasks'
import { ResourceRequest } from './resource'

export interface CacheReducerState {
  /**
   * If set, indicates that an unrecoverable exception has occured.
   */
  error?: any

  data: {
    [scope: string]: CacheScopeState
  }

  tasks: {
    nextId: number

    pausedBy: {
      [taskId: string]: Pointer[]
    }

    /**
     * Holds all tasks that haven't yet been stopped.
     */
    pending: {
      [taskId: string]: ResourceTask
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

export type CacheScopeState = {
  [bucket: string]: {
    [stringifiedId: string]: CachePointerState
  }
}

export interface CachePointerState<
  Data = any,
  Rejection = any,
  Type extends string = any
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
  pointer: Pointer<Type>

  request: null | {
    instance: ResourceRequest
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
  value:
    | null
    | { type: 'data'; data: Data; timestamp: number }
    | { type: 'rejection'; rejection: Rejection; timestamp: number }
}
