import {
  ResourceRefState,
  ResourceSchema,
  ResourceValueUpdater,
} from '../types'

import { MapMergeCallback } from './mapMerge'

export function createUpdateMapper<Data, Rejection>(
  taskId: null | string,
  timestamp: number,
  updates: (readonly [
    string,
    string | number,
    ResourceValueUpdater<Data, Rejection>,
  ])[],
) {
  const updateMapper: MapMergeCallback<Data, Rejection> = (
    docState: ResourceRefState<Data, Rejection>,
    i: number,
  ) => {
    const tasks = docState.tasks
    if (
      taskId !== null &&
      taskId !== tasks.load &&
      taskId !== tasks.manualLoad &&
      taskId !== tasks.subscribe
    ) {
      return
    }

    const update = updates[i][2]
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
                      (docState.value &&
                        docState.value.type === 'data' &&
                        docState.value.data) ||
                        undefined,
                      docState.ref[1],
                      docState.ref[0],
                    ),
              timestamp,
            },
    }
  }
  return updateMapper
}
