import { ResourceRef, ResourceState } from '../types'

import { ChangeTracker } from './changeTracker'

export function purge<Data, Rejection, Id>(
  state: ResourceState<Data, Rejection, Id>,
  {
    taskId,
    refs,
    scope,
  }: { taskId: string; refs: ResourceRef<Id>[]; scope: string },
  stringifyRef: (ref: ResourceRef<Id>) => string,
): ResourceState<Data, Rejection, Id> {
  const scopeState = state.scopes[scope]
  if (!scopeState) {
    return state
  }

  const refKeys = refs.map(stringifyRef)
  const tracker = new ChangeTracker<Data, Rejection, Id>(state, scope)

  let nextScopeState = scopeState
  for (let i = 0; i < refKeys.length; i++) {
    const ref = refs[i]
    const refKey = refKeys[i]
    if (scopeState[refKey]) {
      const tasks = scopeState[refKey].tasks
      if (tasks.purge === taskId) {
        // Delay cloning the state until we know we need to,
        // then use this to check if we've made any changes.
        if (nextScopeState === scopeState) {
          nextScopeState = { ...nextScopeState }
        }
        delete nextScopeState[refKey]

        tracker.recordCacheEffect(ref, undefined)
        tracker.removeDocsFromTasks(ref, tasks)
      }
    }
  }

  if (nextScopeState === scopeState) {
    return state
  }

  const nextRecords = { ...state.scopes }
  if (Object.keys(nextScopeState).length === 0) {
    delete nextRecords[scope]
  } else {
    nextRecords[scope] = nextScopeState
  }

  return tracker.buildNextState(nextRecords)
}
