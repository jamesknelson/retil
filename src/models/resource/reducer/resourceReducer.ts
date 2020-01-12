import { Dispose } from 'store'

import { ResourceAction, ResourceState } from '../types'

import { MapMergeCallback, mapMerge } from './mapMerge'
import { purge } from './purge'
import { reset } from './reset'
import { createUpdateMapper } from './updateMapper'

export function createResourceReducer<Data, Key>(
  computeHashForKey: (key: Key) => string,
) {
  const merge = (
    state: ResourceState<Data, Key>,
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
    state: ResourceState<Data, Key>,
    action: ResourceAction<Data, Key>,
  ): ResourceState<Data, Key> => {
    switch (action.type) {
      case Dispose:
        return reset(state)

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

      case 'clearQueue': {
        return {
          ...state,
          tasks: {
            ...state.tasks,
            queue: {},
          },
          valueChanges: null,
        }
      }

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
        return merge(state, action, keyState => ({
          holdCount: keyState.holdCount + 1,
        }))

      case 'holdWithPause':
        return merge(state, action, keyState => ({
          holdCount: keyState.holdCount + 1,
          pauseCount: keyState.pauseCount + 1,
        }))

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
