import { InitialKeyState } from '../constants'
import { ResourceKeyState, ResourceState } from '../types'

import { ChangeTracker } from './changeTracker'

export type MapMergeCallback<Data, Key> = (
  keyState: ResourceKeyState<Data, Key>,
  index: number,
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
        existingKeyState = hashKeyStates[hashIndex]
        const key = existingKeyState.key
        if (key === keys[i]) {
          const mergeKeyState = callback(existingKeyState, i)
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
      existingKeyState = undefined
    }

    if (!existingKeyState) {
      const initialState = {
        ...InitialKeyState,
        key: keys[i],
      }
      const mergeState = callback(initialState, i)
      if (
        mergeState &&
        mergeState !== initialState &&
        (mergeState.value || mergeState.holdCount || mergeState.pauseCount)
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

    const {
      expired,
      key,
      holdCount,
      pauseCount,
      requestPolicies,
      tasks,
      value,
    } = nextKeyState

    if (pauseCount > 0) {
      if (existingKeyState && existingKeyState.pauseCount === 0) {
        tracker.pauseKeyTasks(key, tasks)
      }
    } else {
      // Don't change any tasks when paused
      const nextTasks = (nextKeyState.tasks = { ...tasks })

      // No need to check for stoppable tasks on new records
      if (existingKeyState) {
        if (existingKeyState.pauseCount > 0) {
          tracker.unpauseKeyTasks(key, tasks)
        }

        if (tasks.purge && holdCount) {
          nextTasks.purge = null
        }
        if (tasks.subscribe && !requestPolicies.subscribe) {
          nextTasks.subscribe = null
        }
        if (
          tasks.expire &&
          (expired || (requestPolicies.subscribe && tasks.subscribe !== false))
        ) {
          nextTasks.expire = null
        }

        // While a `fetchExpired` or `fetchOnce` can sometimes be
        // stopped if the other type of fetch is still active, we'll
        // just leave a fetch running if either type of policy is
        // active.
        const fetchPolicyCount =
          requestPolicies.fetchExpired +
          requestPolicies.fetchManual +
          requestPolicies.fetchOnce
        if (tasks.fetch && !fetchPolicyCount) {
          nextTasks.fetch = null
        }
      }

      // List any tasks which need to be started given the new key state.
      // Note that `updateMapper` will null out any tasks that need to change
      // when the value changes.
      if (tasks.purge === null && holdCount === 0) {
        nextTasks.purge = tracker.startTasks('purge', key, value)
      }
      if (tasks.subscribe === null && requestPolicies.subscribe) {
        nextTasks.subscribe = tracker.startTasks('subscribe', key, value)
      }
      if (
        tasks.expire === null &&
        !expired &&
        value &&
        (tasks.subscribe === false || !requestPolicies.subscribe)
      ) {
        nextTasks.expire = tracker.startTasks('expire', key, value)
      }
      if (
        // When a `fetchManual` policy is added, we'll trigger a new fetch
        // regardless of any existing fetches.
        (requestPolicies.fetchManual &&
          (!existingKeyState ||
            existingKeyState.requestPolicies.fetchManual <
              requestPolicies.fetchManual)) ||
        (tasks.fetch === null &&
          ((requestPolicies.fetchExpired && (expired || !value)) ||
            (requestPolicies.fetchOnce &&
              (!existingKeyState ||
                !existingKeyState.requestPolicies.fetchOnce))))
      ) {
        nextTasks.fetch = tracker.startTasks('fetch', key, value)
      }

      if (existingKeyState && existingKeyState.tasks !== nextKeyState.tasks) {
        tracker.removeKeysFromTasks(
          key,
          existingKeyState.tasks,
          nextKeyState.tasks,
        )
      }
    }

    if (!existingKeyState || existingKeyState.value !== value) {
      tracker.recordValueChange(key, value)
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
