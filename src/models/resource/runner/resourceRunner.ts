import { Reducer, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'

import {
  ResourceAction,
  ResourceEffect,
  ResourceEffectCallback,
  ResourceState,
  ResourceTaskConfig,
} from '../types'

import { ResourceEffectRunner } from './effectRunner'
import { ResourceTaskRunner } from './taskRunner'

export interface RunnerConfig<Data, Key, Context extends object> {
  effect?: ResourceEffectCallback<Data, Key, Context>
  tasks: ResourceTaskConfig<Data, Key, Context>
}

export function createResourceRunner<Data, Key, Context extends object>(
  config: RunnerConfig<Data, Key, Context>,
) {
  const enhancer = (createStore: StoreEnhancerStoreCreator) => (
    reducer: Reducer<ResourceState<Data, Key>, ResourceAction<Data, Key>>,
    ...args: any[]
  ) => {
    const store = createStore(reducer, ...args) as Store<
      ResourceState<Data, Key>,
      ResourceAction<Data, Key>
    >

    let depth = 0
    let processing = false

    let pendingTasks: ResourceState<Data, Key>['tasks']['pending']
    let taskQueue: ResourceState<Data, Key>['tasks']['queue'] = {}
    let taskQueueIds: string[]

    let pendingEffects = new Map<Key, ResourceEffect<Data, Key, Context>>()

    const dispatch = (action: ResourceAction<Data, Key>) => {
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
        if (effectRunner) {
          pendingEffects = new Map([
            ...pendingEffects,
            ...state.effects.map(effect => [effect.key, effect] as const),
          ])
        }

        store.dispatch({ type: 'clearQueue' })

        // Tasks/effects can synchronously dispatch further actions, and we only
        // want to process those jobs on the outermost dispatch.
        if (!processing) {
          processing = true

          while (taskQueueIds.length || pendingEffects.size) {
            if (taskQueueIds.length) {
              // Run a task
              const taskId = taskQueueIds.shift()!
              const task = pendingTasks[taskId]
              const queueType = taskQueue[taskId]

              if (queueType === 'start') {
                taskRunner.start(task)
              } else {
                // Just stop paused tasks for now.
                taskRunner.stop(task)
              }
            } else {
              // Run an effect
              const key = pendingEffects.keys().next().value!
              const effect = pendingEffects.get(key)!
              pendingEffects.delete(key)
              if (effectRunner) {
                effectRunner.run(effect)
              }
            }
          }

          processing = false
        }
      }
    }

    const effectRunner =
      config.effect && new ResourceEffectRunner(config.effect, dispatch)
    const taskRunner = new ResourceTaskRunner(config.tasks, dispatch)

    return {
      ...store,
      dispatch,
    }
  }

  return enhancer as StoreEnhancer
}
