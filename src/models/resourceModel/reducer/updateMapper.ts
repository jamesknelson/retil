import { ResourceKeyState, ResourceValueUpdate } from '../types'

import { MapMergeCallback } from './mapMerge'

export function createUpdateMapper<Data, Key>(
  taskId: null | string,
  timestamp: number,
  updates: (readonly [Key, ResourceValueUpdate<Data, Key>])[],
) {
  const updateMapper: MapMergeCallback<Data, Key> = (
    keyState: ResourceKeyState<Data, Key>,
    i: number,
  ) => {
    const tasks = keyState.tasks
    if (
      taskId !== null &&
      taskId !== tasks.load &&
      taskId !== tasks.manualLoad &&
      taskId !== tasks.subscribe
    ) {
      return
    }

    const [key, update] = updates[i]
    return {
      invalidated: false,
      tasks: {
        // Stop all tasks that take a value
        invalidate: null,
        purge: null,
        // Stop the load if it's just given us a result, but don't stop it
        // if the result came from a subscribe or manual update.
        load: taskId === tasks.load ? null : tasks.load,
        manualLoad: taskId === tasks.manualLoad ? null : tasks.manualLoad,
        // Subscribes can live live longer than a single update
        subscribe: tasks.subscribe,
      },
      value:
        update.type === 'setRejection'
          ? {
              type: 'rejection',
              rejection: update.rejection,
              timestamp,
            }
          : {
              type: 'data',
              data:
                typeof update.update !== 'function'
                  ? update.update
                  : (update.update as Function)(
                      (keyState.value &&
                        keyState.value.type === 'data' &&
                        keyState.value.data) ||
                        undefined,
                      key,
                    ),
              timestamp,
            },
    }
  }
  return updateMapper
}
