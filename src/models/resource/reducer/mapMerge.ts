import {
  ResourceKeyState,
  ResourceKeyTasks,
  ResourceState,
  ResourceStateNode,
  ResourceTaskStub,
  ResourceTaskType,
} from '../types'

import {
  MutableUnrequiredTasks,
  mutableAddToSetMap,
  mutableAddToUnrequiredTasks,
} from './mutable'

const initialKeyState: Omit<ResourceKeyState<any, any>, 'key'> = {
  holdCount: 0,
  pauseCount: 0,
  predictions: [],
  requestPolicies: {
    fetchExpired: 0,
    fetchManual: 0,
    fetchOnce: 0,
    subscribe: 0,
  },
  tasks: {
    effect: null,
    expire: null,
    fetch: null,
    purge: null,
    subscribe: null,
  },
  value: null,
}

export type MapMergeCallback<Data, Key> = (
  keyState: ResourceKeyState<Data, Key>,
  index: number,
) => undefined | false | Partial<ResourceKeyState<Data, Key>>

export type EnqueuedTasks<Key> =
  | { [Type in ResourceTaskType]?: Set<Key> }
  | undefined

function mapMergeKeys<Data, Key, N extends ResourceStateNode<Data, Key>>(
  node: N,
  keys: Key[],
  keyHash: (key: Key) => string,
  callback: MapMergeCallback<Data, Key>,
  unrequiredTasks?: MutableUnrequiredTasks<Key>,
): [N, MutableUnrequiredTasks<Key>?, EnqueuedTasks<Key>?] {
  let enqueuedTasks: EnqueuedTasks<Key> = undefined
  const keyHashes = keys.map(keyHash)
  const nodeKeys = node.keys || {}
  let nextNodeKeys = nodeKeys

  let i = 0
  let j = 0
  outer: for (i = 0; i < keyHashes.length; i++) {
    const hash = keyHashes[i]

    // Look for an existing key state in the store, and if it's found, merge
    // in any changes.
    const keyHashStates = nodeKeys[hash]
    let existingKeyState: ResourceKeyState<Data, Key> | undefined
    let nextKeyState: ResourceKeyState<Data, Key> | undefined
    if (keyHashStates) {
      for (j = 0; j < keyHashStates.length; j++) {
        existingKeyState = keyHashStates[j]
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
    }

    // The key wasn't found in the store. We'll add a new one if the callback
    // returns anything meaningful, or skip changes otherwise.
    if (!nextKeyState) {
      const initialState = {
        ...initialKeyState,
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

    // Don't change any tasks when paused
    if (pauseCount === 0) {
      const tasksUpdate: Partial<ResourceKeyTasks> = {}

      // No need to check for stoppable tasks on new records
      if (existingKeyState) {
        if (tasks.purge && holdCount) {
          tasksUpdate.purge = null
        }
        if (tasks.subscribe && !requestPolicies.subscribe) {
          tasksUpdate.subscribe = null
        }
        if (
          tasks.expire &&
          (expired || (requestPolicies.subscribe && tasks.subscribe !== false))
        ) {
          tasksUpdate.expire = null
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
          tasksUpdate.fetch = null
        }

        if (Object.keys(tasksUpdate).length) {
          nextKeyState.tasks = {
            ...tasks,
            ...tasksUpdate,
          }
          unrequiredTasks = mutableAddToUnrequiredTasks(
            unrequiredTasks,
            key,
            existingKeyState.tasks,
            nextKeyState.tasks,
          )
        }
      }

      // List any tasks which need to be started given the new key state.
      // Note that `updateMapper` will null out any tasks that need to change
      // when the value changes.
      if (tasks.effect === null) {
        enqueuedTasks = mutableAddToSetMap(enqueuedTasks, 'effect', key)
      }
      if (tasks.purge === null && holdCount === 0) {
        enqueuedTasks = mutableAddToSetMap(enqueuedTasks, 'purge', key)
      }
      if (tasks.subscribe === null && requestPolicies.subscribe) {
        enqueuedTasks = mutableAddToSetMap(enqueuedTasks, 'subscribe', key)
      }
      if (
        tasks.expire === null &&
        !expired &&
        value &&
        (tasks.subscribe === false || !requestPolicies.subscribe)
      ) {
        enqueuedTasks = mutableAddToSetMap(enqueuedTasks, 'expire', key)
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
        enqueuedTasks = mutableAddToSetMap(enqueuedTasks, 'fetch', key)
      }
    }

    // Delay cloning the state until we know we need to
    if (nextNodeKeys === nodeKeys) {
      nextNodeKeys = { ...nodeKeys }
    }
    if (nextNodeKeys[hash] === nodeKeys[hash]) {
      nextNodeKeys[hash] = nodeKeys[hash] ? nodeKeys[hash].slice() : []
    }
    nextNodeKeys[hash][j] = nextKeyState

    // End outer for loop
  }

  let nextNode = node
  if (nextNodeKeys !== nodeKeys) {
    nextNode = {
      ...node,
      keys: nextNodeKeys,
    }
  }

  return [nextNode, unrequiredTasks, enqueuedTasks]
}

function mapMergePaths<Data, Key, N extends ResourceStateNode<Data, Key>>(
  node: N,
  path: string[],
  keys: Key[],
  keyHash: (key: Key) => string,
  callback: MapMergeCallback<Data, Key>,
  unrequiredTasks?: MutableUnrequiredTasks<Key>,
): [N, MutableUnrequiredTasks<Key>?, EnqueuedTasks<Key>?] {
  const [head, ...tail] = path
  const childNode = (node.paths && node.paths[head]) || {}

  let [nextChildNode, enqueuedTasks] =
    tail.length === 0
      ? mapMergePaths(childNode, tail, keys, keyHash, callback, unrequiredTasks)
      : mapMergeKeys(childNode, keys, keyHash, callback, unrequiredTasks)

  let nextNode = node
  if (nextChildNode !== childNode) {
    nextNode = {
      ...node,
      paths: {
        ...node.paths,
        [head]: nextChildNode,
      },
    }
  }
  return [nextNode, unrequiredTasks, enqueuedTasks]
}

export function mapMerge<Data, Key>(
  state: ResourceState<Data, Key>,
  path: string[],
  keys: Key[],
  keyHash: (key: Key) => string,
  callback: MapMergeCallback<Data, Key>,
  unrequiredTasks?: MutableUnrequiredTasks<Key>,
): [
  ResourceState<Data, Key>,
  MutableUnrequiredTasks<Key>,
  ResourceTaskStub<Key>[],
] {
  const [nextNode, newTasks] =
    path.length === 0
      ? mapMergeKeys(state, keys, keyHash, callback, unrequiredTasks)
      : mapMergePaths(state, path, keys, keyHash, callback, unrequiredTasks)

  const tasksToEnqueue = [] as ResourceTaskStub<Key>[]

  if (newTasks) {
    const types = Object.keys(newTasks)
    for (let i = 0; i < types.length; i++) {
      const type = types[i] as ResourceTaskType
      const keys = Array.from(newTasks[type]!)

      tasksToEnqueue.push({
        type,
        keys,
      })
    }
  }

  return [nextNode, unrequiredTasks, tasksToEnqueue]
}
