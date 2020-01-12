import {
  ResourceKeyTasks,
  ResourceState,
  ResourceTask,
  ResourceValue,
} from '../types'

import { mapMerge } from './mapMerge'
import { MutableUnrequiredTasks } from './mutable'

export function enqueueTasks<Data, Key, Context extends object>(
  state: ResourceState<Data, Key>,
  tasksWithoutIds: Omit<ResourceTask<Data, Key, Context>, 'id'>[],
  keyHash: (key: Key) => string,
  unrequiredTasks?: MutableUnrequiredTasks<Key>,
): [ResourceState<Data, Key>, MutableUnrequiredTasks<Key>?] {
  if (tasksWithoutIds.length === 0) {
    return [state]
  }

  // TODO:
  // - when adding tasks, check that there's no matching pause before putting
  //   them in the start queue

  let newNextId = state.tasks.nextId

  const mergeTasks = new Map<
    Key,
    [Partial<ResourceKeyTasks>, (ResourceValue<Data> | null)[]]
  >()
  const nextPending = { ...state.tasks.pending }
  const nextStartQueue = state.tasks.startQueue.slice()
  for (let i = 0; i < tasksWithoutIds.length; i++) {
    const id = String(newNextId++)
    const task: ResourceTask<Data, Key, Context> = {
      ...tasksWithoutIds[i],
      id,
      // values are added mutatively below
    }

    nextPending[id] = task
    nextStartQueue.push(id)
    for (let j = 0; j < task.keys.length; j++) {
      const key = task.keys[j]
      let [existing, values] = mergeTasks.get(key) || []
      if (!existing) {
        existing = {}
        values = []
        mergeTasks.set(key, [existing, values])
        task.values = values
      }
      existing[task.type] = task.id
    }
  }

  const $state = {
    ...state,
    tasks: {
      ...state.tasks,
      nextId: newNextId,
      pending: nextPending,
      startQueue: nextStartQueue,
    },
  }

  let [nextState] = mapMerge(
    $state,
    tasksWithoutIds[0].path,
    Array.from(mergeTasks.keys()),
    keyHash,
    keyState => {
      const [newTasks, values] = mergeTasks.get(keyState.key)!
      // We can push the value, as mapMerge will always iterate over keys in
      // the order given.
      values.push(keyState.value)
      return {
        tasks: {
          ...keyState.tasks,
          ...newTasks,
        },
      }
    },
    unrequiredTasks,
  )

  return [nextState, unrequiredTasks]
}
