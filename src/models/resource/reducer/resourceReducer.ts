import { Dispose } from '../../../store'

import { ResourceAction, ResourceState } from '../types'

import { MapMergeCallback, mapMerge } from './mapMerge'
import { purge } from './purge'
import { reset } from './reset'
import { createUpdateMapper } from './updateMapper'

export function createResourceReducer<Data, Key>(
  computeHashForKey: (key: Key) => string,
) {
  const defaultState = reset<Data, Key>()
  const merge = (
    state: ResourceState<Data, Key> = defaultState,
    action: {
      context?: any
      path: string
      keys: Key[]
      taskId?: string | null
    },
    callback: MapMergeCallback<Data, Key>,
  ) => {
    const previousTask = action.taskId && state.tasks.pending[action.taskId]
    const context = previousTask ? previousTask.context : action.context
    return mapMerge(
      state,
      context,
      action.path,
      action.keys,
      computeHashForKey,
      callback,
    )
  }

  const resourceReducer = (
    state: ResourceState<Data, Key> = defaultState,
    action: ResourceAction<Data, Key>,
  ): ResourceState<Data, Key> => {
    switch (action.type) {
      case Dispose:
        return reset(state)

      case 'abandonLoad':
        return merge(state, action, keyState => {
          if (
            keyState.tasks.load === action.taskId ||
            keyState.tasks.forceLoad === action.taskId
          ) {
            return {
              tasks: {
                ...keyState.tasks,
                load: keyState.tasks.forceLoad ? null : false,
                forceLoad: null,
              },
            }
          }
        })

      case 'abandonSubscribe':
        return merge(state, action, keyState => {
          if (keyState.tasks.subscribe === action.taskId) {
            return {
              tasks: {
                ...keyState.tasks,
                subscribe: false,
              },
            }
          }
        })

      case 'abortForceLoad':
        return merge(state, action, keyState => {
          if (keyState.tasks.forceLoad === action.taskId) {
            return {
              tasks: {
                ...keyState.tasks,
                forceLoad: null,
              },
            }
          }
        })

      case 'clearQueue': {
        return {
          ...state,
          effects: [],
          tasks: {
            ...state.tasks,
            queue: {},
          },
        }
      }

      case 'error':
        return {
          ...reset(state),
          error: action.error,
        }

      case 'expire':
        return merge(state, action, keyState => {
          if (
            action.taskId === null ||
            keyState.tasks.expire === action.taskId
          ) {
            return {
              stale: true,
            }
          }
        })

      case 'forceLoad':
        return merge(state, action, (keyState, i, tracker) => ({
          tasks: {
            ...keyState.tasks,
            load: null,
            forceLoad: tracker.startTasks('forceLoad', keyState.key, null),
          },
        }))

      case 'hold':
        return merge(state, action, keyState => {
          let nextRequestPolicies = keyState.requestPolicies
          if (action.requestPolicies) {
            nextRequestPolicies = { ...keyState.requestPolicies }
            for (let i = 0; i < action.requestPolicies.length; i++) {
              ++nextRequestPolicies[action.requestPolicies[i]]
            }
          }
          return {
            holdCount: keyState.holdCount + 1,
            requestPolicies: nextRequestPolicies,
          }
        })

      case 'markAsEvergreen':
        return merge(state, action, keyState => {
          if (keyState.tasks.expire === action.taskId) {
            return {
              stale: false,
              tasks: {
                ...keyState.tasks,
                expire: false,
              },
            }
          }
        })

      case 'pause':
        return merge(state, action, keyState => ({
          pauseCount: keyState.pauseCount + 1,
        }))

      case 'predict':
        return merge(state, action, keyState => ({
          // Add a hold with the prediction, as we don't want the record to be
          // purged with any unresolved predictions.
          holdCount: keyState.holdCount + 1,
          predictions: keyState.predictions.concat(action.prediction),
        }))

      case 'purge':
        return purge(state, action, computeHashForKey)

      case 'releaseHold':
        return merge(state, action, keyState => {
          let nextRequestPolicies = keyState.requestPolicies
          if (action.requestPolicies) {
            nextRequestPolicies = { ...keyState.requestPolicies }
            for (let i = 0; i < action.requestPolicies.length; i++) {
              --nextRequestPolicies[action.requestPolicies[i]]
            }
          }
          return {
            holdCount: keyState.holdCount - 1,
            requestPolicies: nextRequestPolicies,
          }
        })

      case 'resolvePrediction': {
        const updateMapper =
          action.update &&
          createUpdateMapper({
            taskId: null,
            update: action.update,
          })
        const updateIndexes =
          action.update &&
          new Map(action.update.changes.map((update, i) => [update.key, i]))
        return merge(state, action, (keyState, i, tracker) => {
          const updateIndex = updateIndexes && updateIndexes.get(keyState.key)
          return {
            holdCount: keyState.holdCount - 1,
            predictions: keyState.predictions.filter(
              prediction => prediction !== action.prediction,
            ),
            ...(updateIndex === undefined
              ? undefined
              : updateMapper!(keyState, updateIndex, tracker)),
          }
        })
      }

      case 'resumePause':
        return merge(state, action, keyState => ({
          pauseCount: keyState.pauseCount - 1,
        }))

      case 'update':
        return merge(
          state,
          {
            ...action,
            keys: action.update.changes.map(({ key }) => key),
          },
          createUpdateMapper(action),
        )

      default:
        return state
    }
  }

  return resourceReducer
}
