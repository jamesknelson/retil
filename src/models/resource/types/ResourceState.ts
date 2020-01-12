import { ResourcePrediction } from './ResourcePredicton'
import { ResourceRequestPolicy } from './ResourceRequestPolicy'
import { ResourceKeyTasks, ResourceTask } from './ResourceTasks'
import { ResourceValue } from './ResourceValue'

export interface ResourceState<Data, Key> {
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
      [taskId: string]: 'start' | 'pause' | 'stop'
    }
  }

  valueChanges: Map<Key, ResourceValue<Data> | null | undefined> | null
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
