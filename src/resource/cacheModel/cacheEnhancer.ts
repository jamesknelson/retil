import { Reducer, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'

import {
  CacheReducerAction,
  CacheReducerState,
  ResourceTaskConfig,
} from '../types'

import { ResourceTaskRunner } from './taskRunner'

export interface RunnerConfig {
  tasks: ResourceTaskConfig
}

export function createCacheEnhancer(config: RunnerConfig) {
  const enhancer = (createStore: StoreEnhancerStoreCreator) => (
    reducer: Reducer<CacheReducerState, CacheReducerAction>,
    ...args: any[]
  ) => {
    const store = createStore(reducer, ...args) as Store<
      CacheReducerState,
      CacheReducerAction
    >

    let depth = 0
    let processing = false

    let pendingTasks: CacheReducerState['tasks']['pending']
    let taskQueue: CacheReducerState['tasks']['queue'] = {}
    let taskQueueIds: string[]

    const dispatch = (action: CacheReducerAction) => {
      ++depth
      store.dispatch(action)
      --depth

      // The `dispatch` function calls any listeners before completing, which
      // can in turn recursively call `dispatch`. With this in mind, let's wait
      // until the initial dispatch completes before processing any tasks.
      if (depth === 0) {
        const state = store.getState()

        pendingTasks = state.tasks.pending
        taskQueue = {
          ...taskQueue,
          ...state.tasks.queue,
        }
        taskQueueIds = Object.keys(taskQueue)

        if (taskQueueIds.length) {
          store.dispatch({ type: 'clearQueue' })
        }

        // Tasks/effects can synchronously dispatch further actions, and we only
        // want to process those jobs on the outermost dispatch.
        if (!processing) {
          processing = true

          while (taskQueueIds.length) {
            // Run a task
            const taskId = taskQueueIds.shift()!
            const task = pendingTasks[taskId]
            const queueType = taskQueue[taskId]

            delete taskQueue[taskId]

            if (task && queueType === 'start') {
              taskRunner.start(task)
            } else {
              // Just stop paused tasks for now.
              taskRunner.stop(taskId)
            }
          }

          processing = false
        }
      }
    }

    const taskRunner = new ResourceTaskRunner(config.tasks, dispatch)

    return {
      ...store,
      dispatch,
    }
  }

  return enhancer as StoreEnhancer
}
