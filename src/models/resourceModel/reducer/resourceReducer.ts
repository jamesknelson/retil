import { Dispose } from '../../../store'

import { ResourceAction, ResourceState } from '../types'

import { DefaultRequestPolicies } from '../constants'
import { mapMerge } from './mapMerge'
import { purge } from './purge'
import { reset } from './reset'
import { createUpdateMapper } from './updateMapper'

export function resourceReducer<Data, Rejection>(
  state: ResourceState<Data, Rejection> | undefined,
  action: ResourceAction<Data, Rejection>,
): ResourceState<Data, Rejection> {
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

      return mapMerge(task.scope, state, task.refs, refState => {
        switch (action.taskId) {
          // Note: purges can't be abandoned, as it'd cause a memory leak.
          case refState.tasks.invalidate:
            return {
              invalidated: false,
              tasks: {
                ...refState.tasks,
                invalidate: false,
              },
            }
          case refState.tasks.load:
            return {
              tasks: {
                ...refState.tasks,
                load: false,
              },
            }
          case refState.tasks.manualLoad:
            return {
              tasks: {
                ...refState.tasks,
                manualLoad: null,
              },
            }
          case refState.tasks.subscribe:
            return {
              tasks: {
                ...refState.tasks,
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

    case 'dropQuery':
      return mapMerge(action.scope, state, action.query.refs, refState => {
        if (!refState.request) {
          return refState
        }
        const nextRequestPolicies = { ...refState.request.policies }
        for (let i = 0; i < action.requestPolicies.length; i++) {
          --nextRequestPolicies[action.requestPolicies[i]]
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
              : { query: action.query, policies: nextRequestPolicies },
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
      return mapMerge(scope, state, action.refs, refState => {
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
        action.query.refs,
        (refState, i, tracker) => ({
          tasks: {
            ...refState.tasks,
            load: null,
            manualLoad: tracker.startRequestTasks(
              'manualLoad',
              refState.ref,
              action.query,
            ),
          },
        }),
      )

    case 'applyModifiers':
      return mapMerge(action.scope, state, action.refs, refState => {
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
      return purge(task.scope, state, action.refs, action.taskId)
    }

    case 'registerQuery':
      return mapMerge(action.scope, state, action.query.refs, refState => {
        const nextPolicies = {
          ...(refState.request
            ? refState.request.policies
            : DefaultRequestPolicies),
        }
        for (let i = 0; i < action.requestPolicies.length; i++) {
          ++nextPolicies[action.requestPolicies[i]]
        }
        return {
          modifiers: {
            ...refState.modifiers,
            keep: refState.modifiers.keep + 1,
          },
          request: {
            query: action.query,
            policies: nextPolicies,
          },
        }
      })

    case 'updateValue': {
      const previousTask = action.taskId && state.tasks.pending[action.taskId]
      const scope = previousTask ? previousTask.scope : action.scope!
      return mapMerge(
        scope,
        state,
        action.updates,
        createUpdateMapper(action.taskId, action.timestamp, action.updates),
      )
    }

    default:
      return state
  }
}
