import { TaskTypes } from '../constants'
import { ResourceKeyTasks, ResourceTask, ResourceTaskStub } from '../types'

import { ObjOf } from './utils'

export type MutableUnrequiredTasks<Key> = ObjOf<Set<Key>> | undefined

export function mutableAddPathAndContextToTaskStub<Data, Key>(
  taskStubs: ResourceTaskStub<Key>[],
  path: string[],
  context: any,
): Omit<ResourceTask<Data, Key, any>, 'id'>[] {
  const tasks = taskStubs as Omit<ResourceTask<Data, Key, any>, 'id'>[]
  for (let i = 0; i < taskStubs.length; i++) {
    tasks[i].path = path
    tasks[i].context = context
  }
  return tasks
}

export function mutableAddToUnrequiredTasks<Key>(
  unrequiredTasks: MutableUnrequiredTasks<Key>,
  key: Key,
  originalTasks: ResourceKeyTasks,
  nextTasks?: ResourceKeyTasks,
): MutableUnrequiredTasks<Key> {
  let result = unrequiredTasks
  for (let i = 0; i < TaskTypes.length; i++) {
    const type = TaskTypes[i]
    if (
      originalTasks[type] &&
      (!nextTasks || nextTasks[type] !== originalTasks[type])
    ) {
      result = mutableAddToSetMap(result, originalTasks[type] as string, key)
    }
  }
  return result
}

export function mutableAddToSetMap<T, O extends ObjOf<Set<T> | undefined>>(
  map: O | undefined = {} as O,
  key: keyof O,
  value: T,
): O {
  if (map[key]) {
    map[key]!.add(value)
  } else {
    map[key] = new Set([value]) as O[keyof O]
  }
  return map
}
