import { Dispose } from '../../store'

import {
  CacheReducerAction,
  CacheReducerState,
  ResourceRequestTask,
} from '../types'

import { DefaultRequestPolicies } from './constants'
import { mapMerge } from './mapMerge'
import { purge } from './purge'
import { reset } from './reset'
import { createUpdateMapper } from './updateMapper'

export function resourceReducer(
  state: CacheReducerState | undefined,
  action: CacheReducerAction,
): CacheReducerState {
  if (!state) {
    state = reset()
  }

  switch (action.type) {
    case Dispose:
      return reset(state)

    case 'abandonTask': {
      const task = state.tasks.pending[action.taskId]
      if (!task) {
        return state
      }

      return mapMerge(task.scope, state, task.pointers, pointerState => {
        switch (action.taskId) {
          // Note: purges can't be abandoned, as it'd cause a memory leak.
          case pointerState.tasks.invalidate:
            return {
              invalidated: false,
              tasks: {
                ...pointerState.tasks,
                invalidate: false,
              },
            }
          case pointerState.tasks.load:
            return {
              tasks: {
                ...pointerState.tasks,
                load: false,
              },
            }
          case pointerState.tasks.manualLoad:
            return {
              tasks: {
                ...pointerState.tasks,
                manualLoad: null,
              },
            }
          case pointerState.tasks.subscribe:
            return {
              tasks: {
                ...pointerState.tasks,
                subscribe: false,
              },
            }
        }
      })
    }

    case 'clearQueue':
      return {
        ...state,
        tasks: {
          ...state.tasks,
          queue: {},
        },
      }

    case 'dropRequest':
      return mapMerge(action.scope, state, [action.request.root], refState => {
        if (!refState.request) {
          return refState
        }
        const nextRequestPolicies = { ...refState.request.policies }
        for (let i = 0; i < action.policies.length; i++) {
          --nextRequestPolicies[action.policies[i]]
        }
        const sum =
          nextRequestPolicies.loadInvalidated +
          nextRequestPolicies.loadOnce +
          nextRequestPolicies.subscribe
        return {
          modifiers: {
            ...refState.modifiers,
            keep: refState.modifiers.keep - 1,
          },
          request:
            sum === 0
              ? null
              : { instance: action.request, policies: nextRequestPolicies },
        }
      })

    case 'error':
      return {
        ...reset(state),
        error: action.error,
      }

    case 'invalidate': {
      if (action.taskId !== null && !state.tasks.pending[action.taskId]) {
        return state
      }
      const scope = action.taskId
        ? state.tasks.pending[action.taskId].scope
        : action.scope!
      return mapMerge(scope, state, action.pointers, refState => {
        if (
          action.taskId === null ||
          refState.tasks.invalidate === action.taskId
        ) {
          return {
            invalidated: true,
          }
        }
      })
    }

    case 'manualLoad':
      return mapMerge(
        action.scope,
        state,
        [action.request.root],
        (refState, i, tracker) => ({
          tasks: {
            ...refState.tasks,
            load: null,
            manualLoad: tracker.startRequestTasks(
              'manualLoad',
              refState.pointer,
              action.request,
            ),
          },
        }),
      )

    case 'applyModifiers':
      return mapMerge(action.scope, state, action.pointers, refState => {
        return {
          modifiers: {
            keep: refState.modifiers.keep + (action.keep || 0),
            pause: refState.modifiers.pause + (action.pause || 0),
            pending: refState.modifiers.pending + (action.pending || 0),
          },
        }
      })

    case 'purge': {
      const task = state.tasks.pending[action.taskId]
      if (!task) {
        return state
      }
      return purge(task.scope, state, action.pointers, action.taskId)
    }

    case 'registerRequest':
      return mapMerge(action.scope, state, [action.request.root], refState => {
        const nextPolicies = {
          ...(refState.request
            ? refState.request.policies
            : DefaultRequestPolicies),
        }
        for (let i = 0; i < action.policies.length; i++) {
          ++nextPolicies[action.policies[i]]
        }
        return {
          modifiers: {
            ...refState.modifiers,
            keep: refState.modifiers.keep + 1,
          },
          request: {
            instance: action.request,
            policies: nextPolicies,
          },
        }
      })

    case 'updateValue': {
      const taskId = action.taskId

      // Bail if the task has been stopped
      const previousTask = taskId && state.tasks.pending[taskId]
      if (taskId && !previousTask) {
        return state
      }

      // Bail if the request task is no longer required
      const scope = previousTask ? previousTask.scope : action.scope!
      const root =
        (previousTask && (previousTask as ResourceRequestTask).request.root) ||
        undefined
      if (root) {
        const scopeState = state.data[scope]
        const rootState =
          scopeState &&
          scopeState[root.bucket] &&
          scopeState[root.bucket][root.id]
        const tasks = rootState && rootState.tasks
        if (
          !tasks ||
          (taskId !== null &&
            taskId !== tasks.load &&
            taskId !== tasks.manualLoad &&
            taskId !== tasks.subscribe)
        ) {
          return state
        }
      }

      return mapMerge(
        scope,
        state,
        action.chunks,
        createUpdateMapper(taskId, action.timestamp, action.chunks),
      )
    }

    default:
      return state
  }
}
