import {
  ResourceDocState,
  ResourceState,
  ResourceRef,
  ResourceQuery,
} from '../types'

import { InitialDocState } from '../constants'
import { ChangeTracker } from './changeTracker'

export type MapMergeCallback<Data, Rejection, Id> = (
  keyState: ResourceDocState<Data, Rejection, Id>,
  index: number,
  tracker: ChangeTracker<Data, Rejection, Id>,
) => undefined | false | Partial<ResourceDocState<Data, Rejection, Id>>

export function mapMerge<Data, Rejection, Id>(
  state: ResourceState<Data, Rejection, Id>,
  props: any,
  scope: string,
  refs: ResourceRef<Id>[],
  stringifyRef: (ref: ResourceRef<Id>) => string,
  query: ResourceQuery<Id> | undefined,
  callback: MapMergeCallback<Data, Rejection, Id>,
): ResourceState<Data, Rejection, Id> {
  const tracker = new ChangeTracker<Data, Rejection, Id>(
    state,
    scope,
    props,
    query,
  )
  const keyHashes = refs.map(stringifyRef)
  const scopeState = state.scopes[scope] || {}
  let nextScopeState = scopeState

  let i = 0
  let hashIndex = 0
  outer: for (i = 0; i < keyHashes.length; i++) {
    const hash = keyHashes[i]
    const hashKeyStates = scopeState[hash]
    let existingKeyState: ResourceDocState<Data, Rejection, Id> | undefined
    let nextKeyState: ResourceDocState<Data, Rejection, Id> | undefined
    if (hashKeyStates) {
      for (hashIndex = 0; hashIndex < hashKeyStates.length; hashIndex++) {
        const key = hashKeyStates[hashIndex].id
        if (key === refs[i]) {
          existingKeyState = hashKeyStates[hashIndex]
          const mergeKeyState = callback(existingKeyState, i, tracker)
          if (mergeKeyState && mergeKeyState !== existingKeyState) {
            nextKeyState = {
              ...existingKeyState,
              ...mergeKeyState,
            }
            break
          } else {
            continue outer
          }
        }
      }
    }

    if (!existingKeyState) {
      const initialState = {
        ...InitialDocState,
        key: refs[i],
      }
      const mergeState = callback(initialState, i, tracker)
      if (
        mergeState &&
        mergeState !== initialState &&
        (mergeState.value || !canPurge(mergeState))
      ) {
        nextKeyState = {
          ...initialState,
          ...mergeState,
        }
      }
    }

    if (!nextKeyState) {
      continue
    }

    const { invalidated, id: key, policies, tasks, value } = nextKeyState
    const existingPolicies = existingKeyState
      ? existingKeyState.policies
      : InitialDocState.policies
    const nextTasks = (nextKeyState.tasks = { ...tasks })

    if (canPurge(nextKeyState)) {
      if (tasks.purge === null) {
        nextTasks.purge = tracker.startTasks('purge', key)
      }
    } else {
      if (tasks.purge) {
        nextTasks.purge = null
      }

      if (tasks.load) {
        if (policies.loadInvalidated + policies.loadOnce === 0) {
          nextTasks.load = null
        } else {
          const pausePolicies =
            policies.expectingExternalUpdate + policies.pauseLoad
          const existingPausePolicies =
            existingPolicies.expectingExternalUpdate +
            existingPolicies.pauseLoad
          if (pausePolicies && !existingPausePolicies) {
            tracker.pauseDocTask(key, tasks.load)
          } else if (!pausePolicies && existingPausePolicies) {
            tracker.unpauseDocTask(key, tasks.load)
          }
        }
      } else if (
        tasks.load === null &&
        tasks.manualLoad === null &&
        !policies.expectingExternalUpdate &&
        !policies.pauseLoad &&
        ((policies.loadInvalidated && (invalidated || !value)) ||
          (policies.loadOnce && !existingPolicies.loadOnce))
      ) {
        nextTasks.load = tracker.startTasks('load', key)
      }

      if (tasks.invalidate) {
        if (invalidated || (policies.subscribe && tasks.subscribe !== false)) {
          nextTasks.invalidate = null
        }
      } else if (
        tasks.invalidate === null &&
        value &&
        !invalidated &&
        (!policies.subscribe || tasks.subscribe === false)
      ) {
        nextTasks.invalidate = tracker.startTasks('invalidate', key)
      }

      if (tasks.subscribe) {
        if (!policies.subscribe) {
          nextTasks.subscribe = null
        }
      } else if (tasks.subscribe === null && policies.subscribe) {
        nextTasks.subscribe = tracker.startTasks('subscribe', key)
      }
    }

    if (existingKeyState && existingKeyState.tasks !== nextKeyState.tasks) {
      tracker.removeDocsFromTasks(
        key,
        existingKeyState.tasks,
        nextKeyState.tasks,
      )
    }
    if (!existingKeyState || existingKeyState.value !== value) {
      tracker.recordCacheEffect(key, value)
    }

    // Delay cloning the state until we know we need to, as this could be a
    // pretty large object.
    if (nextScopeState === scopeState) {
      nextScopeState = { ...scopeState }
    }
    if (nextScopeState[hash] === scopeState[hash]) {
      nextScopeState[hash] = scopeState[hash] ? scopeState[hash].slice() : []
    }
    nextScopeState[hash][hashIndex] = nextKeyState
  }

  if (nextScopeState === scopeState) {
    // No changes to records means no changes to tasks either, so bail early.
    return state
  }

  return tracker.buildNextState({
    ...state.scopes,
    [scope]: nextScopeState,
  })
}

function canPurge({
  policies,
  tasks,
}: Partial<ResourceDocState<any, any, any>>): boolean {
  return (
    !(tasks && tasks.manualLoad) &&
    !(
      policies &&
      !!(
        policies.keep +
        policies.expectingExternalUpdate +
        policies.loadInvalidated +
        policies.loadOnce +
        policies.pauseLoad +
        policies.subscribe
      )
    )
  )
}
