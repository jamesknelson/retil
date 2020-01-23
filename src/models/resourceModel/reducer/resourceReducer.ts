import { Dispose } from '../../../store'

import {
  ResourceAction,
  ResourceQuery,
  ResourceRef,
  ResourceState,
} from '../types'

import { MapMergeCallback, mapMerge } from './mapMerge'
import { purge } from './purge'
import { reset } from './reset'
import { createUpdateMapper } from './updateMapper'

export function createResourceReducer<Data, Rejection, Id>(
  stringifyRef: (ref: ResourceRef<Id>) => string,
) {
  const defaultState = reset<Id>()
  const merge = (
    state: ResourceState<Data, Rejection, Id> = defaultState,
    action: {
      props?: any
      scope: string
      refs: ResourceRef<Id>[]
      query?: ResourceQuery<Id>
      taskId?: string | null
    },
    callback: MapMergeCallback<Data, Rejection, Id>,
  ) => {
    const previousTask = action.taskId && state.tasks.pending[action.taskId]
    const props = previousTask ? previousTask.props : action.props
    return mapMerge(
      state,
      props,
      action.scope,
      action.refs,
      stringifyRef,
      action.query || undefined,
      callback,
    )
  }

  const resourceReducer = (
    state: ResourceState<Data, Rejection, Id> = defaultState,
    action: ResourceAction<Data, Rejection, Id>,
  ): ResourceState<Data, Rejection, Id> => {
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
            manualLoad: tracker.startTasks('manualLoad', keyState.id),
          },
        }))

      case 'purge':
        return purge(state, action, stringifyRef)

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
        const context = previousTask ? previousTask.props : action.props
        return paths.reduce(
          (state, path) =>
            mapMerge(
              state,
              context,
              path,
              action.updates,
              stringifyRef,
              createUpdateMapper(
                action.taskId,
                action.timestamp,
                action.updates,
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
