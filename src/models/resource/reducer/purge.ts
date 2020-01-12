import { ResourceState, ResourceStateNode, PurgeAction } from '../types'

import { MutableUnrequiredTasks, mutableAddToUnrequiredTasks } from './mutable'
import { stopUnrequiredTasks } from './stopUnrequiredTasks'
import { removeObjectKey } from './utils'

export function purge<Key, Data>(
  state: ResourceState<Data, Key>,
  { taskId, keys, path }: PurgeAction<Key>,
  computeHashForKey: (key: Key) => string,
): ResourceState<Data, Key> {
  const [node, unrequiredTasks] =
    path.length === 0
      ? purgeKeys(state, taskId, keys, computeHashForKey)
      : purgePathKeys(state, taskId, keys, path, computeHashForKey)

  if (node === state) {
    return state
  }

  return stopUnrequiredTasks(
    {
      ...state,
      // Set keys/paths to empty in the case that they're not returned
      // by the child purge function.
      keys: {},
      paths: {},
      ...node,
    },
    unrequiredTasks,
    computeHashForKey,
  )
}

function purgeKeys<Data, Key>(
  node: ResourceStateNode<Data, Key>,
  taskId: string,
  keys: Key[],
  computeHashForKey: (key: Key) => string,
): [ResourceStateNode<Data, Key>?, MutableUnrequiredTasks<Key>?] {
  let unrequiredTasks: MutableUnrequiredTasks<Key> = undefined

  if (!node.keys) {
    return [node, unrequiredTasks]
  }

  const hashes = keys.map(computeHashForKey)
  const nodeKeys = node.keys
  let nextNodeKeys = nodeKeys
  outer: for (let i = 0; i < hashes.length; i++) {
    const hash = hashes[i]
    const keyHashStates = nextNodeKeys[hash]
    if (keyHashStates) {
      for (let j = 0; j < keyHashStates.length; j++) {
        const { key, tasks } = keyHashStates[j]
        if (key === keys[i]) {
          if (tasks.purge === taskId) {
            // Delay cloning the state until we know we need to
            if (nextNodeKeys === nodeKeys) {
              nextNodeKeys = { ...nextNodeKeys }
            }

            if (keyHashStates.length === 1) {
              delete nextNodeKeys[hash]
            } else {
              nextNodeKeys[hash] = keyHashStates.slice()
              nextNodeKeys[hash].splice(i, 1)
            }

            unrequiredTasks = mutableAddToUnrequiredTasks(
              unrequiredTasks,
              key,
              tasks,
            )
          }
          continue outer
        }
      }
    }
  }

  return [
    nextNodeKeys === nodeKeys
      ? node
      : Object.keys(nextNodeKeys).length === 0
      ? node.paths
        ? {
            paths: node.paths,
          }
        : undefined
      : {
          ...node,
          keys: nodeKeys,
        },
    unrequiredTasks,
  ]
}

function purgePathKeys<Key, Data>(
  node: ResourceStateNode<Data, Key>,
  taskId: string,
  keys: Key[],
  path: string[],
  computeHashForKey: (key: Key) => string,
): [ResourceStateNode<Data, Key>?, MutableUnrequiredTasks<Key>?] {
  const [head, ...tail] = path
  const childNode = node.paths && node.paths[head]
  if (!childNode) {
    return [node, {}]
  }

  let [nextChildNode, unrequiredTasks] =
    tail.length === 0
      ? purgeKeys(childNode, taskId, keys, computeHashForKey)
      : purgePathKeys(childNode, taskId, keys, tail, computeHashForKey)

  let nextNode: ResourceStateNode<Data, Key> | undefined = node
  if (nextChildNode === undefined) {
    if (Object.keys(node.paths!).length === 1) {
      nextNode = node.keys ? { keys: node.keys } : undefined
    } else {
      nextNode = {
        ...node,
        paths: removeObjectKey(node.paths!, head),
      }
    }
  } else if (nextChildNode !== childNode) {
    nextNode = {
      ...node,
      paths: {
        ...node.paths,
        [head]: nextChildNode,
      },
    }
  }

  return [nextNode, unrequiredTasks]
}
