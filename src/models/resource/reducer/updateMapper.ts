import { ResourceKeyState, UpdateAction } from '../types'

import { MapMergeCallback } from './mapMerge'

export function createUpdateMapper<Data, Key>(action: UpdateAction<Data, Key>) {
  const updateMapper: MapMergeCallback<Data, Key> = (
    keyState: ResourceKeyState<Data, Key>,
    i: number,
  ) => {
    const tasks = keyState.tasks
    if (
      action.taskId !== null &&
      action.taskId !== tasks.fetch &&
      action.taskId !== tasks.subscribe
    ) {
      return
    }

    const data = action.updates[i].value

    return {
      expired: !!action.updates[i].expired,
      tasks: {
        // Stop all tasks that take a value
        expire: null,
        purge: null,
        // Stop the fetch if it's just given us a result, but don't stop it
        // if the result came from a subscribe
        fetch: action.taskId === tasks.fetch ? null : tasks.fetch,
        // Subscribes can live live longer than a single update
        subscribe: tasks.subscribe,
      },
      value:
        typeof data === 'function'
          ? {
              data: data(
                (keyState.value && keyState.value.data) || undefined,
                keyState.key,
              ),
              status: 'data',
              timestamp: action.timestamp,
            }
          : data,
    }
  }
  return updateMapper
}
