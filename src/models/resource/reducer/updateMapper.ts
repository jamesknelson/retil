import { ResourceKeyState, ResourceUpdate, ResourceValue } from '../types'

import { MapMergeCallback } from './mapMerge'

export function createUpdateMapper<Data, Key>(action: {
  taskId: null | string
  update: ResourceUpdate<Data, Key>
}) {
  const updateMapper: MapMergeCallback<Data, Key> = (
    keyState: ResourceKeyState<Data, Key>,
    i: number,
  ) => {
    const { taskId, update } = action
    const tasks = keyState.tasks
    if (
      taskId !== null &&
      taskId !== tasks.load &&
      taskId !== tasks.forceLoad &&
      taskId !== tasks.subscribe
    ) {
      return
    }

    const value = update.changes[i].value

    return {
      stale: !!update.changes[i].stale,
      tasks: {
        // Stop all tasks that take a value
        expire: null,
        purge: null,
        // Stop the load if it's just given us a result, but don't stop it
        // if the result came from a subscribe or manual update.
        load: taskId === tasks.load ? null : tasks.load,
        forceLoad: taskId === tasks.forceLoad ? null : tasks.forceLoad,
        // Subscribes can live live longer than a single update
        subscribe: tasks.subscribe,
      },
      value:
        typeof value === 'function'
          ? {
              data: value(
                (keyState.value &&
                  keyState.value.status === 'retrieved' &&
                  keyState.value.data) ||
                  undefined,
                keyState.key,
              ),
              status: 'retrieved',
              timestamp: update.timestamp,
            }
          : value,
    }
  }
  return updateMapper
}
