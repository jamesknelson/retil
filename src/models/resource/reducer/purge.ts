import { ResourceState, PurgeAction } from '../types'

import { ChangeTracker } from './changeTracker'

export function purge<Key, Data>(
  state: ResourceState<Data, Key>,
  { taskId, keys, path }: PurgeAction<Key>,
  computeHashForKey: (key: Key) => string,
): ResourceState<Data, Key> {
  const pathRecords = state.records[path]
  if (!pathRecords) {
    return state
  }

  const keyHashes = keys.map(computeHashForKey)
  const tracker = new ChangeTracker<Data, Key>(state, path)

  let nextPathRecords = pathRecords
  outer: for (let i = 0; i < keyHashes.length; i++) {
    const hash = keyHashes[i]
    const keyHashStates = nextPathRecords[hash]
    if (keyHashStates) {
      for (let j = 0; j < keyHashStates.length; j++) {
        const { key, tasks } = keyHashStates[j]
        if (key === keys[i]) {
          if (tasks.purge === taskId) {
            // Delay cloning the state until we know we need to,
            // then use this to check if we've made any changes.
            if (nextPathRecords === pathRecords) {
              nextPathRecords = { ...nextPathRecords }
            }

            if (keyHashStates.length === 1) {
              delete nextPathRecords[hash]
            } else {
              nextPathRecords[hash] = keyHashStates.slice()
              nextPathRecords[hash].splice(i, 1)
            }

            tracker.removeKeysFromTasks(key, tasks)
          }
          continue outer
        }
      }
    }
  }

  if (nextPathRecords === pathRecords) {
    return state
  }

  const nextRecords = { ...state.records }
  if (Object.keys(nextPathRecords).length === 0) {
    delete nextRecords[path]
  } else {
    nextRecords[path] = nextPathRecords
  }

  return tracker.buildNextState(nextRecords)
}
