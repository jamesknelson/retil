import { ResourceKeyState, ResourceState } from '../types'

import { InitialKeyState } from '../constants'
import { ChangeTracker } from './changeTracker'

export type MapMergeCallback<Data, Key> = (
  keyState: ResourceKeyState<Data, Key>,
  index: number,
  tracker: ChangeTracker<Data, Key>,
) => undefined | false | Partial<ResourceKeyState<Data, Key>>

export function mapMerge<Data, Key>(
  state: ResourceState<Data, Key>,
  context: any,
  path: string,
  keys: Key[],
  computeHashForKey: (key: Key) => string,
  callback: MapMergeCallback<Data, Key>,
): ResourceState<Data, Key> {
  const tracker = new ChangeTracker<Data, Key>(state, path, context)
  const keyHashes = keys.map(computeHashForKey)
  const pathRecords = state.records[path] || {}
  let nextPathRecords = pathRecords

  let i = 0
  let hashIndex = 0
  outer: for (i = 0; i < keyHashes.length; i++) {
    const hash = keyHashes[i]
    const hashKeyStates = pathRecords[hash]
    let existingKeyState: ResourceKeyState<Data, Key> | undefined
    let nextKeyState: ResourceKeyState<Data, Key> | undefined
    if (hashKeyStates) {
      for (hashIndex = 0; hashIndex < hashKeyStates.length; hashIndex++) {
        const key = hashKeyStates[hashIndex].key
        if (key === keys[i]) {
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
        ...InitialKeyState,
        key: keys[i],
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

    const { invalidated, key, policies, tasks, value } = nextKeyState
    const existingPolicies = existingKeyState
      ? existingKeyState.policies
      : InitialKeyState.policies
    const nextTasks = (nextKeyState.tasks = { ...tasks })

    if (canPurge(nextKeyState)) {
      if (tasks.purge === null) {
        nextTasks.purge = tracker.startTasks('purge', key, value)
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
            tracker.pauseKeyTask(key, tasks.load)
          } else if (!pausePolicies && existingPausePolicies) {
            tracker.unpauseKeyTask(key, tasks.load)
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
        nextTasks.load = tracker.startTasks('load', key, value)
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
        nextTasks.invalidate = tracker.startTasks('invalidate', key, value)
      }

      if (tasks.subscribe) {
        if (!policies.subscribe) {
          nextTasks.subscribe = null
        }
      } else if (tasks.subscribe === null && policies.subscribe) {
        nextTasks.subscribe = tracker.startTasks('subscribe', key, value)
      }
    }

    if (existingKeyState && existingKeyState.tasks !== nextKeyState.tasks) {
      tracker.removeKeysFromTasks(
        key,
        existingKeyState.tasks,
        nextKeyState.tasks,
      )
    }
    if (!existingKeyState || existingKeyState.value !== value) {
      tracker.recordEffect(key, value)
    }

    // Delay cloning the state until we know we need to, as this could be a
    // pretty large object.
    if (nextPathRecords === pathRecords) {
      nextPathRecords = { ...pathRecords }
    }
    if (nextPathRecords[hash] === pathRecords[hash]) {
      nextPathRecords[hash] = pathRecords[hash] ? pathRecords[hash].slice() : []
    }
    nextPathRecords[hash][hashIndex] = nextKeyState
  }

  if (nextPathRecords === pathRecords) {
    // No changes to records means no changes to tasks either, so bail early.
    return state
  }

  return tracker.buildNextState({
    ...state.records,
    [path]: nextPathRecords,
  })
}

function canPurge({
  policies,
  tasks,
}: Partial<ResourceKeyState<any, any>>): boolean {
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
