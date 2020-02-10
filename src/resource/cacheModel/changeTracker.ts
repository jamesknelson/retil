import {
  CachePointerState,
  CacheReducerState,
  Pointer,
  ResourceCacheTask,
  ResourceRequest,
  ResourceRequestTask,
} from '../types'

import { TaskTypes } from './constants'

export class ChangeTracker {
  private nextNextTaskId: number
  private nextPausedBy: { [taskId: string]: Pointer[] } | undefined
  private nextPending: CacheReducerState['tasks']['pending'] | undefined
  private nextQueue: CacheReducerState['tasks']['queue'] | undefined

  private startedCacheTasks: {
    invalidate?: readonly [/* taskId */ string, Pointer[], CachePointerState[]]
    purge?: readonly [/* taskId */ string, Pointer[], CachePointerState[]]
  }
  private startedRequestTasks: Map<
    ResourceRequest,
    {
      load?: [/* taskId */ string, Pointer[]]
      manualLoad?: [/* taskId */ string, Pointer[]]
      subscribe?: [/* taskId */ string, Pointer[]]
    }
  >

  constructor(
    private readonly prevState: CacheReducerState,
    private scope: string,
  ) {
    this.nextNextTaskId = prevState.tasks.nextId
    this.startedCacheTasks = {}
    this.startedRequestTasks = new Map()
  }

  buildNextState(nextRecords: CacheReducerState['data']): CacheReducerState {
    const prevState = this.prevState

    let nextTasks = prevState.tasks
    if (
      this.nextNextTaskId !== prevState.tasks.nextId ||
      this.nextPausedBy ||
      this.nextPending ||
      this.nextQueue
    ) {
      nextTasks = {
        nextId: this.nextNextTaskId,
        pending: this.nextPending || { ...prevState.tasks.pending },
        pausedBy: this.nextPausedBy || { ...prevState.tasks.pausedBy },
        queue: this.nextQueue || { ...prevState.tasks.queue },
      }

      // Add newly started tasks
      const startedCacheTaskTypes = Object.keys(this.startedCacheTasks) as (
        | 'invalidate'
        | 'purge'
      )[]
      for (const type of startedCacheTaskTypes) {
        const [taskId, pointers, states] = this.startedCacheTasks[type]!
        nextTasks.queue[taskId] = 'start'
        nextTasks.pending[taskId] = {
          type,
          scope: this.scope,
          pointers,
          taskId,
          states,
        }
      }
      for (let [request, started] of this.startedRequestTasks.entries()) {
        const startedTypes = Object.keys(started) as (
          | 'load'
          | 'manualLoad'
          | 'subscribe'
        )[]
        for (const type of startedTypes) {
          const [taskId, pointers] = started[type]!
          nextTasks.queue[taskId] = 'start'
          nextTasks.pending[taskId] = {
            type,
            scope: this.scope,
            pointers,
            taskId,
            request,
          }
        }
      }
    }

    return {
      ...prevState,
      data: nextRecords,
      tasks: nextTasks,
    }
  }

  /**
   * Returns the taskId that the doc was added to
   */
  startCacheTask(
    type: ResourceCacheTask['type'],
    pointer: Pointer,
    state: CachePointerState,
  ): string {
    let tuple = this.startedCacheTasks[type]
    if (!tuple) {
      tuple = this.startedCacheTasks[type] = [
        String(this.nextNextTaskId++),
        [],
        [],
      ]
    }
    tuple[1].push(pointer)
    tuple[2].push(state)
    return tuple[0]
  }

  /**
   * Returns the taskId that the doc was added to
   */
  startRequestTasks(
    type: ResourceRequestTask['type'],
    pointer: Pointer,
    query: ResourceRequest,
  ): string {
    let queryStartedTasks = this.startedRequestTasks.get(query)
    if (!queryStartedTasks) {
      this.startedRequestTasks.set(query, (queryStartedTasks = {}))
    }
    let tuple = queryStartedTasks[type]
    if (!tuple) {
      tuple = queryStartedTasks[type] = [String(this.nextNextTaskId++), []]
    }
    tuple[1].push(pointer)
    return tuple[0]
  }

  pausePointerTask(pointer: Pointer, taskId: string) {
    this.nextPausedBy = this.nextPausedBy || {
      ...this.prevState.tasks.pausedBy,
    }
    this.nextQueue = this.nextQueue || { ...this.prevState.tasks.queue }

    const pointers = this.nextPausedBy[taskId]
    if (pointers) {
      this.nextPausedBy[taskId] = pointers.concat(pointer)
    } else {
      this.nextPausedBy[taskId] = [pointer]
      this.nextQueue[taskId] = 'pause'
    }
  }

  removePointerFromTasks(
    pointer: Pointer,
    prevTasks: CachePointerState<any, any>['tasks'],
    nextTasks?: CachePointerState<any, any>['tasks'],
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
        const taskPointers = this.nextPending[taskId].pointers
        const nextTaskPointers = removePointer(taskPointers, pointer)
        if (nextTaskPointers !== taskPointers) {
          this.nextPending[taskId] = {
            ...this.prevState.tasks.pending[taskId],
            pointers: nextTaskPointers,
          }

          if (nextTaskPointers.length === 0) {
            delete this.nextPending[taskId]
            delete this.nextPausedBy[taskId]
            this.nextQueue[taskId] = 'stop'
          } else {
            this.attemptToUnpauseTask(taskId, pointer)
          }
        }
      }
    }
  }

  unpauseRefTask(pointer: Pointer, taskId: string) {
    this.nextPausedBy = this.nextPausedBy || {
      ...this.prevState.tasks.pausedBy,
    }
    this.nextQueue = this.nextQueue || { ...this.prevState.tasks.queue }
    this.attemptToUnpauseTask(taskId, pointer)
  }

  private attemptToUnpauseTask(taskId: string, pointer: Pointer) {
    let pausedRefs = this.nextPausedBy![taskId]
    if (pausedRefs) {
      if (pausedRefs === this.prevState.tasks.pausedBy[taskId]) {
        this.nextPausedBy![taskId] = pausedRefs = pausedRefs.slice()
      }
      const nextPausedRefs = removePointer(pausedRefs, pointer)
      if (nextPausedRefs.length === 0) {
        delete this.nextPausedBy![taskId]
        this.nextQueue![taskId] = 'start'
      } else {
        this.nextPausedBy![taskId] = nextPausedRefs
      }
    }
  }
}

function removePointer(
  pointers: Pointer[],
  pointerToRemove: Pointer,
): Pointer[] {
  if (pointers.length === 1) {
    if (
      pointers[0].bucket === pointerToRemove.bucket &&
      pointers[0].id === pointerToRemove.id
    ) {
      return []
    }
  } else {
    const index = pointers.findIndex(
      pausedRef =>
        pausedRef.bucket === pointerToRemove.bucket &&
        pausedRef.id === pointerToRemove.id,
    )
    if (index !== -1) {
      const result = pointers.slice()
      result.splice(index, 1)
      return result
    }
  }
  return pointers
}
