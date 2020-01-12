import { Reducer, Store, StoreEnhancer } from 'redux'

import {
  ResourceAction,
  ResourceExpireTask,
  ResourceFetchTask,
  ResourcePurgeTask,
  ResourceState,
  ResourceSubscribeTask,
  ResourceValueChangeEffect,
} from './types'

export interface RunnerConfig<Data, Key, Context extends object> {
  computeHashForKey?: (key: Key) => string
  effect?: ResourceValueChangeEffect<Data, Key, Context>
  tasks: {
    expire?: ResourceExpireTask<Data, Key, Context>
    fetch?: ResourceFetchTask<Data, Key, Context>
    purge?: ResourcePurgeTask<Data, Key, Context>
    subscribe?: ResourceSubscribeTask<Data, Key, Context>
  }
}

export function createResourceRunner<Data, Key, Context extends object>(
  config: RunnerConfig<Data, Key, Context>,
) {
  const { computeHashForKey, tasks: strategies } = config

  const enhancer = createStore => (
    reducer: Reducer<ResourceState<Data, Key>, ResourceAction<Data, Key>>,
    ...args: any[]
  ) => {
    const store = createStore(reducer, ...args) as Store<
      ResourceState<Data, Key>,
      ResourceAction<Data, Key>
    >

    let depth = 0
    let processing = false

    const jobs = []

    const dispatch = (action: ResourceAction<Data, Key>) => {
      ++depth
      store.dispatch(action)
      --depth

      // The `dispatch` function calls any listeners before completing, which
      // can in turn recursively call `dispatch`. With this in mind, let's wait
      // until the initial dispatch completes before processing any tasks.
      if (depth === 0) {
        const state = store.getState()

        store.dispatch({ type: 'clearQueue' })

        const { pausedBy, pending, queue } = state.tasks

        jobs.push(...)

        // Jobs can synchronously dispatch further actions, and we only want to
        // process those jobs on the outermost dispatch.
        if (!processing) {
          processing = true

          while (jobs.length)
            const job = jobs.shift()!

            // // The start queue needs to be processed before the stop queue, as
            // // any new effects for a key should be run before the previous effect's
            // // cleanup function is run.
            // const newStoppers = {} as { [taskId: string]: () => void }
            // for (let i = 0; i < startQueue.length; i++) {
            //   const taskId = startQueue[i]
            //   const task = pending[taskId]

            //   switch (task.type) {
            //     case 'effect':
            //       break
            //     case 'expire':
            //       break
            //     case 'fetch':
            //       break
            //     case 'purge':
            //       break
            //     case 'subscribe':
            //       break
            //   }
          }

          processing = false
        }
      }
    }

    return {
      ...store,
      dispatch,
    }
  }

  return enhancer as StoreEnhancer
}
