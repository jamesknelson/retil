import { ResourcePrediction } from './ResourcePredicton'
import { ResourceRequestPolicy } from './ResourceRequestPolicy'
import { ResourceKeyTasks, ResourceTask } from './ResourceTasks'
import { ResourceValue } from './ResourceValue'

export interface ResourceStateNode<Data, Key> {
  keys?: {
    [keyHash: string]: ResourceKeyState<Data, Key>[]
  }
  paths?: {
    [pathPath: string]: ResourceStateNode<Data, Key>
  }
}

export interface ResourceState<Data, Key> extends ResourceStateNode<Data, Key> {
  error?: any

  pauses: {
    path: string[]
    keys: Key[]
  }[]

  tasks: {
    nextId: number

    /**
     * Holds all tasks until we receive notification that they've been stopped.
     */
    pending: {
      [taskId: string]: ResourceTask<Data, Key, any>
    }

    /**
     * A list of tasks that still need to be started. This is identical to
     * the list of tasks that are in `pending`, but do not yet have a
     * stopper.
     */
    startQueue: string[]

    /**
     * Holds any tasks that need to have their `abort` method called.
     */
    stopQueue: {
      id: string

      /**
       * Used by `pause` -- indicates that after stopping, the task id should be
       * moved back to the start queue.
       */
      reenqueue?: boolean
    }[]

    /**
     * Holds stoppers for tasks that are currently running.
     */
    stoppers: {
      [taskId: string]: () => void
    }
  }
}

export interface ResourceKeyState<Data = any, Key = any> {
  /**
   * If this is true, indicates that the current state should no longer be
   * treated as valid -- and should put the the key into error state if not
   * selected and if the strategy has given up fetching new values.
   */
  expired?: boolean

  holdCount: number

  /**
   * The document's primary key.
   *
   * Only one record with a given key will ever be stored. If another record is
   * stored with the same key, it'll cause any existing record to be removed --
   * even if using different context keys.
   */
  key: Key

  pauseCount: number

  /**
   * Holds a list of pending predictions, in the format of tokens that correspond
   * to functions that take the current data, and return a predicted change.
   */
  predictions: ResourcePrediction<Data, Key>[]

  requestPolicies: {
    [Policy in ResourceRequestPolicy]: number
  }

  /**
   * Tasks can be deactivated for just some of their keys, so we need to store
   * the active status for each separate key separately to the task itself.
   *
   * Can point to either active *or* queued tasks -- as there should only ever
   * be a single task for any strategy. Tasks in the stop queue should not
   * appear here.
   */
  tasks: ResourceKeyTasks

  /**
   * Stores any data received at the last update. Only available when status
   * is `available`.
   */
  value: ResourceValue<Data> | null
}
