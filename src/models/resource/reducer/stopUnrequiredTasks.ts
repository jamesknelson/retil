import { ResourceState, ResourceTask, ResourceTaskStub } from '../types'

import { enqueueTasks } from './enqueueTasks'
import { MutableUnrequiredTasks } from './mutable'
import { subtractArrays } from './utils'

/**
 * For effect tasks, unlistening any keys will *always* stop the task, as the
 * effect should always have an accurate list of keys need it. In the case that
 * there are keys remaining, a new effect will be enqueued for them.
 */
export function stopUnrequiredTasks<Data, Key>(
  state: ResourceState<Data, Key>,
  unrequiredTasks: MutableUnrequiredTasks<Key>,
  keyHash: (key: Key) => string,
): ResourceState<Data, Key> {
  let nextState = state

  const tasksToEnqueue = [] as Omit<ResourceTask<Data, Key, any>, 'id'>[]

  if (unrequiredTasks) {
    const unrequiredTaskIds = Object.keys(unrequiredTasks)
    let nextPending = state.tasks.pending
    let nextStartQueue = state.tasks.startQueue
    let nextStopQueue = state.tasks.stopQueue

    for (let i = 0; i < unrequiredTaskIds.length; i++) {
      const taskId = unrequiredTaskIds[i]
      const task = state.tasks.pending[taskId]
      if (task) {
        const remainingKeys = subtractArrays(
          task.keys,
          Array.from(unrequiredTasks[taskId]),
        )

        if (remainingKeys.length !== 0 && task.type !== 'effect') {
          // Re-enqueue effects with any remaining keys.
          if (nextPending === state.tasks.pending) {
            nextPending = { ...state.tasks.pending }
          }
          nextPending[taskId] = {
            ...task,
            keys: remainingKeys,
          }
        } else if (
          remainingKeys.length === 0 &&
          !state.tasks.stoppers[task.id]
        ) {
          // For tasks that haven't started yet, we can just clear them without
          // first adding them to the stop queue
          if (nextPending === state.tasks.pending) {
            nextPending = { ...state.tasks.pending }
          }
          delete nextPending[task.id]

          const startQueueIndex = nextStartQueue.indexOf(task.id)
          if (startQueueIndex !== -1) {
            if (nextStartQueue === state.tasks.startQueue) {
              nextStartQueue = state.tasks.startQueue.slice()
            }
            nextStartQueue.splice(startQueueIndex, 1)
          }
        } else {
          // Remove effect tasks, and tasks with no remaining keys.
          if (nextStopQueue === state.tasks.stopQueue) {
            nextStopQueue = { ...nextStopQueue }
          }
          nextStopQueue.push({ id: task.id })

          if (task.type === 'effect' && remainingKeys.length > 0) {
            tasksToEnqueue.push({
              ...task,
              keys: remainingKeys,
            })
          }
        }
      }
    }

    nextState = {
      ...state,
      tasks: {
        ...state.tasks,
        pending: nextPending,
        startQueue: nextStartQueue,
        stopQueue: nextStopQueue,
      },
    }
  }

  // Any overridden tasks here are effects that have already been cleaned up,
  // so we don't need to worry about the cleanup phase.
  return enqueueTasks(nextState, tasksToEnqueue, keyHash)[0]
}
