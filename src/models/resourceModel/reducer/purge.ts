import { CacheKey, ResourceState, ResourceRefState } from '../types'

import { ChangeTracker } from './changeTracker'

export function purge<Data, Rejection>(
  scope: string,
  state: ResourceState<Data, Rejection>,
  refs: CacheKey[],
  taskId: string,
): ResourceState<Data, Rejection> {
  const scopeState = state.scopes[scope]
  if (!scopeState) {
    return state
  }

  const purgedTypes = new Set<string>()
  const purgedStates = {} as {
    [type: string]: {
      [id: string]: ResourceRefState<Data, Rejection>
    }
  }
  const tracker = new ChangeTracker<Data, Rejection>(state, scope)

  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i]
    const [type, id] = ref
    const refState = scopeState[type] && scopeState[type][id]
    if (refState) {
      const tasks = refState.tasks
      if (tasks.purge === taskId) {
        // Delay cloning the state until we know we need to,
        // then use this to check if we've made any changes.
        if (!purgedTypes.has(type)) {
          purgedStates[type] = { ...scopeState[type] }
          purgedTypes.add(type)
        }

        delete purgedStates[type][id]

        tracker.removeRefsFromTasks(ref, tasks)
      }
    }
  }

  if (purgedTypes.size === 0) {
    return state
  }

  const nextScopeState = { ...scopeState }
  for (let type of purgedTypes.values()) {
    if (Object.keys(purgedStates[type]).length === 0) {
      delete nextScopeState[type]
    } else {
      nextScopeState[type] = purgedStates[type]
    }
  }

  const nextScopeStates = { ...state.scopes }
  if (Object.keys(nextScopeState).length === 0) {
    delete nextScopeStates[scope]
  } else {
    nextScopeStates[scope] = nextScopeState
  }

  return tracker.buildNextState(nextScopeStates)
}
