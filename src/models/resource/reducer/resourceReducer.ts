import { TaskTypes } from '../constants'
import { ResourceAction, ResourceState, ResourceTask } from '../types'

import { enqueueTasks } from './enqueueTasks'
import { MapMergeCallback, mapMerge } from './mapMerge'
import { purge } from './purge'
import { reset } from './reset'
import { stopUnrequiredTasks } from './stopUnrequiredTasks'
import { mutableAddPathAndContextToTaskStub } from './mutable'
import { createUpdateMapper } from './updateMapper'
import { extractByKey } from './utils'

export function createResourceReducer<Data, Key>(
  computeHashForKey: (key: Key) => string,
) {
  const merge = (
    state: ResourceState<Data, Key>,
    action: {
      context?: any
      path: string[]
      keys: Key[]
      taskId?: string | null
    },
    callback: MapMergeCallback<Data, Key>,
  ) => {
    let [nextState, unrequiredTasks, taskStubs = []] = mapMerge(
      state,
      action.path,
      action.keys,
      computeHashForKey,
      callback,
    )

    if (taskStubs.length) {
      const previousTask = action.taskId && state.tasks.pending[action.taskId]
      const tasksToEnqueue = mutableAddPathAndContextToTaskStub<Data, Key>(
        taskStubs,
        action.path,
        previousTask ? previousTask.context : action.context,
      )
      ;[nextState, unrequiredTasks] = enqueueTasks(
        nextState,
        tasksToEnqueue,
        computeHashForKey,
        unrequiredTasks,
      )
    }

    return stopUnrequiredTasks(nextState, unrequiredTasks, computeHashForKey)
  }

  const resourceReducer = (
    state: ResourceState<Data, Key>,
    action: ResourceAction<Data, Key>,
  ): ResourceState<Data, Key> => {
    switch (action.type) {
      case 'abandonFetch':
        return merge(state, action, keyState => {
          if (keyState.tasks.fetch !== action.taskId) {
            return
          }
          return {
            tasks: {
              ...keyState.tasks,
              fetch: false,
            },
          }
        })

      case 'abandonSubscribe':
        return merge(state, action, keyState => {
          if (keyState.tasks.subscribe !== action.taskId) {
            return
          }
          return {
            tasks: {
              ...keyState.tasks,
              subscribe: false,
            },
          }
        })

      case 'error': {
        return action.taskId !== null && !state.tasks.pending[action.taskId]
          ? state
          : {
              ...reset(state),
              error: action.error,
            }
      }

      case 'expire':
        return merge(state, action, keyState => {
          if (
            action.taskId !== null &&
            keyState.tasks.expire !== action.taskId
          ) {
            return
          }
          return {
            expired: true,
          }
        })

      case 'hold':
        return merge(state, action, keyState => {
          return {
            holdCount: keyState.holdCount + 1,
          }
        })

      case 'holdWithPause': {
        // TODO:
        // - when adding a pause, stop all tasks that match the pause, without
        //   removing them from pending

        const taskIdsToPauseSet = new Set<string>()
        const nextState = merge(state, action, keyState => {
          const tasks = keyState.tasks
          for (let i = 0; i < TaskTypes.length; i++) {
            const taskType = TaskTypes[i]
            if (tasks[taskType]) {
              taskIdsToPauseSet.add(tasks[taskType] as string)
            }
          }
          return {
            pauseCount: keyState.pauseCount + 1,
            holdCount: keyState.holdCount + 1,
          }
        })

        if (!taskIdsToPauseSet.size) {
          return nextState
        }

        const [remainingStoppers, stoppers] = extractByKey(
          state.tasks.stoppers,
          Array.from(taskIdsToPauseSet),
        )
        const pausedTasks = Object.keys(stoppers).map(id => ({
          id,
          reenqueue: true,
        }))

        return {
          ...nextState,
          tasks: {
            ...nextState.tasks,
            stoppers: remainingStoppers,
            stopQueue: nextState.tasks.stopQueue.concat(pausedTasks),
          },
        }
      }

      case 'holdWithPrediction':
        return merge(state, action, keyState => ({
          holdCount: keyState.holdCount + 1,
          predictions: keyState.predictions.concat(action.prediction),
        }))

      case 'holdWithRequestPolicy':
        return merge(state, action, keyState => {
          const nextPolicies = { ...keyState.requestPolicies }
          for (let i = 0; i < action.requestPolicies.length; i++) {
            ++nextPolicies[action.requestPolicies[i]]
          }
          return {
            holdCount: keyState.holdCount + 1,
            requestPolicies: nextPolicies,
          }
        })

      case 'markAsEvergreen':
        return merge(state, action, keyState => {
          if (keyState.tasks.expire !== action.taskId) {
            return
          }
          return {
            expired: false,
            tasks: {
              ...keyState.tasks,
              expire: false,
            },
          }
        })

      case 'purge':
        return purge(state, action, computeHashForKey)

      case 'releaseHold':
        return merge(state, action, keyState => ({
          holdCount: keyState.holdCount - 1,
        }))

      case 'releaseHoldWithPause':
        // TODO:
        // - when removing the last pause for any key, recompute the start
        //   queue.
        return merge(state, action, keyState => ({
          holdCount: keyState.holdCount - 1,
          pauseCount: keyState.pauseCount - 1,
        }))

      case 'releaseHoldWithPrediction': {
        const updateMapper = createUpdateMapper({
          ...action,
          type: 'update',
          taskId: null,
        })
        const updateIndexes = new Map(
          action.updates.map((update, i) => [update.key, i]),
        )
        return merge(state, action, keyState => {
          const updateIndex = updateIndexes.get(keyState.key)
          return {
            holdCount: keyState.holdCount - 1,
            predictions: keyState.predictions.filter(
              prediction => prediction !== action.prediction,
            ),
            ...(updateIndex === undefined
              ? undefined
              : updateMapper(keyState, updateIndex)),
          }
        })
      }

      case 'releaseHoldWithRequestPolicy':
        return merge(state, action, keyState => {
          const nextPolicies = { ...keyState.requestPolicies }
          for (let i = 0; i < action.requestPolicies.length; i++) {
            --nextPolicies[action.requestPolicies[i]]
          }
          return {
            holdCount: keyState.holdCount - 1,
            requestPolicies: nextPolicies,
          }
        })

      case 'startedTasks': {
        const nextStartQueue = state.tasks.startQueue.slice()
        const stopQueueAdditions = [] as { id: string }[]
        const nextStoppers = { ...state.tasks.stoppers, ...action.taskStoppers }
        const startedIds = Object.keys(action.taskStoppers)

        // Tasks that are still pending can be removed from the start queue.
        for (let i = 0; i < startedIds.length; i++) {
          const id = startedIds[i]
          if (state.tasks.pending[id]) {
            const index = nextStartQueue.indexOf(id)
            if (index !== -1) {
              nextStartQueue.splice(index, 1)
            }
          } else {
            stopQueueAdditions.push({ id })
          }
        }

        // Any non-pending tasks have been started whether we wanted that or
        // not, so let's move them to the stop queue.
        const nextStopQueue = stopQueueAdditions.length
          ? state.tasks.stopQueue.concat(stopQueueAdditions)
          : state.tasks.stopQueue

        return {
          ...state,
          tasks: {
            ...state.tasks,
            startQueue: nextStartQueue,
            stopQueue: nextStopQueue,
            stoppers: nextStoppers,
          },
        }
      }

      case 'stoppedTasks': {
        const reenqueueTasks = [] as ResourceTask<Data, Key, any>[]

        // Walk *backwards* through the stop queue, removing any tasks that
        // have been stopped.
        const nextStopQueue = state.tasks.stopQueue.slice()
        const nextPending = { ...state.tasks.pending }
        for (let i = nextStopQueue.length - 1; i >= 0; --i) {
          const { id, reenqueue } = nextStopQueue[i]
          if (action.taskIds.indexOf(id) !== -1) {
            const task = state.tasks.pending[id]
            delete nextPending[id]
            nextStopQueue.splice(i, 1)
            if (reenqueue && task) {
              reenqueueTasks.push(task)
            }
          }
        }

        if (nextStopQueue.length === state.tasks.stopQueue.length) {
          return state
        }

        // Remove any keys on the reenqueued tasks that are no longer required.
        for (let i = reenqueueTasks.length - 1; i >= 0; --i) {
          const task = reenqueueTasks[i]
          const remainingTaskKeys = task.keys.slice()
          merge(state, task, keyState => {
            if (keyState.tasks[task.type] !== task.id) {
              remainingTaskKeys.splice(
                remainingTaskKeys.indexOf(keyState.key, 1),
              )
            }
            // Just using this as a forEach. It's a little hacky, but a specific
            // forEach function would be a pretty heavy addition.
            return undefined
          })
          if (remainingTaskKeys.length === 0) {
            reenqueueTasks.splice(i, 1)
          } else {
            reenqueueTasks[i] = {
              ...task,
              keys: remainingTaskKeys,
            }
          }
        }

        // `enqueueTasks` will return an unrequired tasks list, but it should
        // only contain the tasks that have just stopped, so we ignore it.
        const [nextState] = enqueueTasks(
          {
            ...state,
            tasks: {
              ...state.tasks,
              stopQueue: nextStopQueue,
            },
          },
          reenqueueTasks,
          computeHashForKey,
        )

        return nextState
      }

      case 'update':
        return merge(
          state,
          {
            ...action,
            keys: action.updates.map(({ key }) => key),
          },
          createUpdateMapper(action),
        )
    }
  }

  return resourceReducer
}
