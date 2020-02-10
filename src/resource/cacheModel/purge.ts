import { CacheReducerState, CachePointerState, PointerList } from '../types'

import { ChangeTracker } from './changeTracker'

export function purge(
  scope: string,
  state: CacheReducerState,
  pointers: PointerList,
  taskId: string,
): CacheReducerState {
  const scopeState = state.data[scope]
  if (!scopeState) {
    return state
  }

  const purgedTypes = new Set<string>()
  const purgedStates = {} as {
    [type: string]: {
      [id: string]: CachePointerState
    }
  }
  const tracker = new ChangeTracker(state, scope)

  for (let i = 0; i < pointers.length; i++) {
    const pointer = pointers[i]
    const { bucket, id } = pointer
    const refState = scopeState[bucket] && scopeState[bucket][id]
    if (refState) {
      const tasks = refState.tasks
      if (tasks.purge === taskId) {
        // Delay cloning the state until we know we need to,
        // then use this to check if we've made any changes.
        if (!purgedTypes.has(bucket)) {
          purgedStates[bucket] = { ...scopeState[bucket] }
          purgedTypes.add(bucket)
        }

        delete purgedStates[bucket][id]

        tracker.removePointerFromTasks(pointer, tasks)
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

  const nextScopeStates = { ...state.data }
  if (Object.keys(nextScopeState).length === 0) {
    delete nextScopeStates[scope]
  } else {
    nextScopeStates[scope] = nextScopeState
  }

  return tracker.buildNextState(nextScopeStates)
}
