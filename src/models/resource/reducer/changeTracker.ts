import {
  ResourceEffect,
  ResourceKeyTasks,
  ResourceTaskType,
  ResourceValue,
  ResourceState,
} from '../types'

import { TaskTypes } from '../constants'

export class ChangeTracker<Data, Key> {
  private effects: ResourceEffect<Data, Key, any>[]

  private nextNextId: number
  private nextPausedBy: { [key: string]: Key[] } | undefined
  private nextPending: ResourceState<Data, Key>['tasks']['pending'] | undefined
  private nextQueue: ResourceState<Data, Key>['tasks']['queue'] | undefined

  private startedTasks: { [Type in ResourceTaskType]?: [string, Key[]] }

  // Used to record values for new task objects
  private keyValues: Map<Key, ResourceValue<Data> | null>

  constructor(
    private readonly prevState: ResourceState<Data, Key>,
    private path: string,
    private context?: any,
  ) {
    this.effects = []
    this.keyValues = new Map()
    this.nextNextId = prevState.tasks.nextId
    this.startedTasks = {}
  }

  buildNextState(
    nextRecords: ResourceState<Data, Key>['records'],
  ): ResourceState<Data, Key> {
    const prevState = this.prevState

    let nextEffects = prevState.effects
    if (this.effects.length) {
      nextEffects = prevState.effects.concat(this.effects)
    }

    let nextTasks = prevState.tasks
    if (
      this.nextNextId !== prevState.tasks.nextId ||
      this.nextPausedBy ||
      this.nextPending ||
      this.nextQueue
    ) {
      nextTasks = {
        nextId: this.nextNextId,
        pending: this.nextPending || { ...prevState.tasks.pending },
        pausedBy: this.nextPausedBy || { ...prevState.tasks.pausedBy },
        queue: this.nextQueue || { ...prevState.tasks.queue },
      }

      // Add newly started tasks
      const types = Object.keys(this.startedTasks) as ResourceTaskType[]
      for (let i = 0; i < types.length; i++) {
        const type = types[i]
        const [id, keys] = this.startedTasks[type] as [string, Key[]]
        nextTasks.queue[id] = 'start'
        nextTasks.pending[id] = {
          type,
          context: this.context,
          path: this.path,
          keys,
          id,
          values: keys.map(key => this.keyValues.get(key)!),
        }
      }
    }

    return {
      ...prevState,
      effects: nextEffects,
      records: nextRecords,
      tasks: nextTasks,
    }
  }

  recordEffect(key: Key, value: ResourceValue<Data> | null | undefined) {
    this.effects.push({
      context: this.context,
      path: this.path,
      key,
      value,
    })
  }

  /**
   * Returns the taskId for that the key was added to
   */
  startTasks(
    type: ResourceTaskType,
    key: Key,
    value: ResourceValue<Data> | null,
  ): string {
    let pair = this.startedTasks[type]
    if (!pair) {
      pair = this.startedTasks[type] = [String(this.nextNextId++), []]
    }
    pair[1].push(key)
    this.keyValues.set(key, value)
    return pair[0]
  }

  pauseKeyTasks(key: Key, tasks: ResourceKeyTasks) {
    this.nextPausedBy = this.nextPausedBy || {
      ...this.prevState.tasks.pausedBy,
    }
    this.nextQueue = this.nextQueue || { ...this.prevState.tasks.queue }

    for (let i = 0; i < TaskTypes.length; i++) {
      const type = TaskTypes[i]
      const taskId = tasks[type]
      if (taskId) {
        const keys = this.nextPausedBy[taskId]
        if (keys) {
          this.nextPausedBy[taskId] = keys.concat(key)
        } else {
          this.nextPausedBy[taskId] = [key]
          this.nextQueue[taskId] = 'pause'
        }
      }
    }
  }

  removeKeysFromTasks(
    key: Key,
    prevTasks: ResourceKeyTasks,
    nextTasks?: ResourceKeyTasks,
  ) {
    this.nextPausedBy = this.nextPausedBy || {
      ...this.prevState.tasks.pausedBy,
    }
    this.nextPending = this.nextPending || { ...this.prevState.tasks.pending }
    this.nextQueue = this.nextQueue || { ...this.prevState.tasks.queue }

    for (let i = 0; i < TaskTypes.length; i++) {
      const type = TaskTypes[i]
      const taskId = prevTasks[type]
      const nextTaskId = nextTasks && nextTasks[type]
      if (taskId && nextTaskId !== taskId) {
        let keys = this.nextPending[taskId].keys
        if (keys === this.prevState.tasks.pending[taskId].keys) {
          keys = keys.slice()
          this.nextPending[taskId] = {
            ...this.prevState.tasks.pending[taskId],
            keys,
          }
        }

        if (keys.length === 1 && keys[0] === key) {
          delete this.nextPending[taskId]
          delete this.nextPausedBy[taskId]
          this.nextQueue[taskId] = 'stop'
        } else {
          const index = keys.indexOf(key)
          if (index !== -1) {
            keys.splice(index, 1)
          }
          this.attemptToUnpauseTask(taskId, key)
        }
      }
    }
  }

  unpauseKeyTasks(key: Key, tasks: ResourceKeyTasks) {
    this.nextPausedBy = this.nextPausedBy || {
      ...this.prevState.tasks.pausedBy,
    }
    this.nextQueue = this.nextQueue || { ...this.prevState.tasks.queue }

    for (let i = 0; i < TaskTypes.length; i++) {
      const taskId = tasks[TaskTypes[i]]
      if (taskId) {
        this.attemptToUnpauseTask(taskId, key)
      }
    }
  }

  private attemptToUnpauseTask(taskId: string, key: Key) {
    let keys = this.nextPausedBy![taskId]
    if (keys) {
      if (keys === this.prevState.tasks.pausedBy[taskId]) {
        this.nextPausedBy![taskId] = keys = keys.slice()
      }
      if (keys.length === 1 && keys[0] === key) {
        delete this.nextPausedBy![taskId]
        this.nextQueue![taskId] = 'start'
      } else {
        const index = keys.indexOf(key)
        if (index !== -1) {
          keys.splice(index, 1)
        }
      }
    }
  }
}
