import { Reducer, Store, StoreEnhancer } from 'redux'

import {
  ResourceEffect,
  ResourceExpireStrategy,
  ResourceFetchStrategy,
  ResourcePurgeStrategy,
  ResourceSubscribeStrategy,
  ResourceAction,
  ResourceState,
  ResourceStateNode,
} from './types'

export interface TaskRunnerConfig<Data, Key, Context extends object> {
  computeHashForKey?: (key: Key) => string
  strategies: {
    effect?: ResourceEffect<Data, Key, Context>
    expire?: ResourceExpireStrategy<Data, Key, Context>
    fetch?: ResourceFetchStrategy<Data, Key, Context>
    purge?: ResourcePurgeStrategy<Data, Key, Context>
    subscribe?: ResourceSubscribeStrategy<Data, Key, Context>
  }
}

export function createTaskRunner<Data, Key, Context extends object>(
  config: TaskRunnerConfig<Data, Key, Context>,
) {
  const { computeHashForKey, strategies } = config

  const enhancer = createStore => (
    reducer: Reducer<ResourceState<Data, Key>, ResourceAction<Data, Key>>,
    ...args: any[]
  ) => {
    const store = createStore(reducer, ...args) as Store<
      ResourceState<Data, Key>,
      ResourceAction<Data, Key>
    >

    const dispatch = (action: ResourceAction<Data, Key>) => {
      store.dispatch(action)

      // Ok, we've dispatched the action. Let's check the task queues and start
      // or stop any required actions.

      const state = store.getState()
      const { pending, startQueue, stopQueue, stoppers } = state.tasks

      // The start queue needs to be processed before the stop queue, as
      // any new effects for a key should be run before the previous effect's
      // cleanup function is run.
      const newStoppers = {} as { [taskId: string]: () => void }
      for (let i = 0; i < startQueue.length; i++) {
        const taskId = startQueue[i]
        const task = pending[taskId]

        switch (task.type) {
          case 'effect':
            break
          case 'expire':
            break
          case 'fetch':
            break
          case 'purge':
            break
          case 'subscribe':
            break
        }
      }

      for (let i = 0; i < stopQueue.length; i++) {
        stoppers[stopQueue[i].id]()
      }
      if (stopQueue.length) {
        store.dispatch({
          type: 'stoppedTasks',
          taskIds: stopQueue.map(item => item.id),
        })
      }

      // TODO:
      // - if we've started a manual fetch, then dispatch a release once there
      //   are no more active fetch tasks
    }

    return {
      ...store,
      dispatch,
    }
  }

  return enhancer as StoreEnhancer
}
