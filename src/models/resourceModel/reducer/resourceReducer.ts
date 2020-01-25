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

    case 'holdModifierPolicies':
      return mapMerge(action.scope, state, action.refs, refState => {
        const nextModifierPolicies = { ...refState.modifierPolicies }
        for (let i = 0; i < action.policies.length; i++) {
          ++nextModifierPolicies[action.policies[i]]
        }
        return {
          modifierPolicies: nextModifierPolicies,
        }
      })

    case 'holdRequestPolicies':
      return mapMerge(action.scope, state, action.query.refs, refState => {
        const nextPolicies = {
          ...(refState.request
            ? refState.request.policies
            : DefaultRequestPolicies),
        }
        for (let i = 0; i < action.policies.length; i++) {
          ++nextPolicies[action.policies[i]]
        }
        return {
          request: {
            query: action.query,
            policies: nextPolicies,
          },
        }
      })

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

    case 'purge': {
      const task = state.tasks.pending[action.taskId]
      if (!task) {
        return state
      }
      return purge(task.scope, state, action.refs, action.taskId)
    }

    case 'releaseModifierPolicies':
      return mapMerge(action.scope, state, action.refs, refState => {
        const nextModifierPolicies = { ...refState.modifierPolicies }
        for (let i = 0; i < action.policies.length; i++) {
          --nextModifierPolicies[action.policies[i]]
        }
        return {
          modifierPolicies: nextModifierPolicies,
        }
      })

    case 'releaseRequestPolicies':
      return mapMerge(action.scope, state, action.query.refs, refState => {
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
          request:
            sum === 0
              ? null
              : { query: action.query, policies: nextRequestPolicies },
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
