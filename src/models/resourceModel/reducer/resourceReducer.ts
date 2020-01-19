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

      case 'abandonTask':
        return merge(state, action, keyState => {
          switch (action.taskId) {
            // Note: purges can't be abandoned, as it'd cause a memory leak.
            case keyState.tasks.invalidate:
              return {
                invalidated: false,
                tasks: {
                  ...keyState.tasks,
                  invalidate: false,
                },
              }
            case keyState.tasks.load:
              return {
                tasks: {
                  ...keyState.tasks,
                  load: false,
                },
              }
            case keyState.tasks.manualLoad:
              return {
                tasks: {
                  ...keyState.tasks,
                  manualLoad: null,
                },
              }
            case keyState.tasks.subscribe:
              return {
                tasks: {
                  ...keyState.tasks,
                  subscribe: false,
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

      case 'invalidate':
        return merge(state, action, keyState => {
          if (
            action.taskId === null ||
            keyState.tasks.invalidate === action.taskId
          ) {
            return {
              invalidated: true,
            }
          }
        })

      case 'holdPolicies':
        return merge(state, action, keyState => {
          const nextPolicies = { ...keyState.policies }
          for (let i = 0; i < action.policies.length; i++) {
            ++nextPolicies[action.policies[i]]
          }
          return {
            policies: nextPolicies,
          }
        })

      case 'manualLoad':
        return merge(state, action, (keyState, i, tracker) => ({
          tasks: {
            ...keyState.tasks,
            load: null,
            manualLoad: tracker.startTasks('manualLoad', keyState.key, null),
          },
        }))

      case 'purge':
        return purge(state, action, computeHashForKey)

      case 'releasePolicies':
        return merge(state, action, keyState => {
          const nextPolicies = { ...keyState.policies }
          for (let i = 0; i < action.policies.length; i++) {
            --nextPolicies[action.policies[i]]
          }
          return {
            policies: nextPolicies,
          }
        })

      case 'updateValue': {
        const paths = Object.keys(action.updates)
        const previousTask = action.taskId && state.tasks.pending[action.taskId]
        const context = previousTask ? previousTask.context : action.context
        return paths.reduce(
          (state, path) =>
            mapMerge(
              state,
              context,
              path,
              action.updates[path].map(([key]) => key),
              computeHashForKey,
              createUpdateMapper(
                action.taskId,
                action.timestamp,
                action.updates[path],
              ),
            ),
          state,
        )
      }

      default:
        return state
    }
  }

  return resourceReducer
}