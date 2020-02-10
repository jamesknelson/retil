import { CachePointerState, ChunkList } from '../types'

import { MapMergeCallback } from './mapMerge'

export function createUpdateMapper(
  taskId: null | string,
  timestamp: number,
  chunks: ChunkList,
) {
  const updateMapper: MapMergeCallback = (
    state: CachePointerState,
    i: number,
  ) => {
    const tasks = state.tasks
    const { bucket, id, payload } = chunks[i]

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
        payload.type === 'rejection'
          ? {
              type: 'rejection',
              rejection: payload.rejection,
              timestamp,
            }
          : {
              type: 'data',
              data: payload.merge
                ? payload.merge(
                    (state.value &&
                      state.value.type === 'data' &&
                      state.value.data) ||
                      undefined,
                    payload.data,
                    id,
                    bucket,
                  )
                : payload.data,
              timestamp,
            },
    }
  }
  return updateMapper
}
