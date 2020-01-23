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

export interface RunnerConfig<Props extends object, Data, Rejection, Id> {
  effect?: ResourceEffectCallback<Props, Data, Rejection, Id>
  tasks: ResourceTaskConfig<Props, Data, Rejection, Id>
}

export function createResourceRunner<Props extends object, Data, Rejection, Id>(
  config: RunnerConfig<Props, Data, Rejection, Id>,
) {
  const enhancer = (createStore: StoreEnhancerStoreCreator) => (
    reducer: Reducer<
      ResourceState<Data, Rejection, Id>,
      ResourceAction<Data, Rejection, Id>
    >,
    ...args: any[]
  ) => {
    const store = createStore(reducer, ...args) as Store<
      ResourceState<Data, Rejection, Id>,
      ResourceAction<Data, Rejection, Id>
    >

    let depth = 0
    let processing = false

    let pendingTasks: ResourceState<Data, Rejection, Id>['tasks']['pending']
    let taskQueue: ResourceState<Data, Rejection, Id>['tasks']['queue'] = {}
    let taskQueueIds: string[]

    let pendingEffects = new Map<
      Id,
      ResourceEffect<Props, Data, Rejection, Id>
    >()

    const dispatch = (action: ResourceAction<Data, Rejection, Id>) => {
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
            ...state.effects.map(effect => [effect.id, effect] as const),
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

              delete taskQueue[taskId]

              if (task && queueType === 'start') {
                taskRunner.start(task)
              } else {
                // Just stop paused tasks for now.
                taskRunner.stop(taskId)
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
