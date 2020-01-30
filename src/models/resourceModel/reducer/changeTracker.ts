import {
  ResourceCacheTask,
  ResourceQuery,
  ResourceRef,
  ResourceRefState,
  ResourceRequestTask,
  ResourceState,
} from '../types'

import { TaskTypes } from '../constants'

export class ChangeTracker<Data, Rejection> {
  private nextNextTaskId: number
  private nextPausedBy: { [taskId: string]: ResourceRef[] } | undefined
  private nextPending:
    | ResourceState<Data, Rejection>['tasks']['pending']
    | undefined
  private nextQueue:
    | ResourceState<Data, Rejection>['tasks']['queue']
    | undefined

  private startedCacheTasks: {
    invalidate?: readonly [
      /* taskId */ string,
      ResourceRef[],
      ResourceRefState<Data, Rejection>[],
    ]
    purge?: readonly [
      /* taskId */ string,
      ResourceRef[],
      ResourceRefState<Data, Rejection>[],
    ]
  }
  private startedRequestTasks: Map<
    ResourceQuery<any, Data, Rejection>,
    {
      load?: [/* taskId */ string, ResourceRef[]]
      manualLoad?: [/* taskId */ string, ResourceRef[]]
      subscribe?: [/* taskId */ string, ResourceRef[]]
    }
  >

  constructor(
    private readonly prevState: ResourceState<Data, Rejection>,
    private scope: string,
  ) {
    this.nextNextTaskId = prevState.tasks.nextId
    this.startedCacheTasks = {}
    this.startedRequestTasks = new Map()
  }

  buildNextState(
    nextRecords: ResourceState<Data, Rejection>['scopes'],
  ): ResourceState<Data, Rejection> {
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
        const [taskId, refs, states] = this.startedCacheTasks[type]!
        nextTasks.queue[taskId] = 'start'
        nextTasks.pending[taskId] = {
          type,
          scope: this.scope,
          refs,
          taskId,
          states,
        }
      }
      for (let [query, started] of this.startedRequestTasks.entries()) {
        const startedTypes = Object.keys(started) as (
          | 'load'
          | 'manualLoad'
          | 'subscribe'
        )[]
        for (const type of startedTypes) {
          const [taskId, refs] = started[type]!
          nextTasks.queue[taskId] = 'start'
          nextTasks.pending[taskId] = {
            type,
            scope: this.scope,
            refs,
            taskId,
            query,
          }
        }
      }
    }

    return {
      ...prevState,
      scopes: nextRecords,
      tasks: nextTasks,
    }
  }

  /**
   * Returns the taskId that the doc was added to
   */
  startCacheTask(
    type: ResourceCacheTask<any, any>['type'],
    ref: ResourceRef,
    state: ResourceRefState<Data, Rejection>,
  ): string {
    let tuple = this.startedCacheTasks[type]
    if (!tuple) {
      tuple = this.startedCacheTasks[type] = [
        String(this.nextNextTaskId++),
        [],
        [],
      ]
    }
    tuple[1].push(ref)
    tuple[2].push(state)
    return tuple[0]
  }

  /**
   * Returns the taskId that the doc was added to
   */
  startRequestTasks(
    type: ResourceRequestTask<any, any>['type'],
    ref: ResourceRef,
    query: ResourceQuery<any, Data, Rejection>,
  ): string {
    let queryStartedTasks = this.startedRequestTasks.get(query)
    if (!queryStartedTasks) {
      this.startedRequestTasks.set(query, (queryStartedTasks = {}))
    }
    let tuple = queryStartedTasks[type]
    if (!tuple) {
      tuple = queryStartedTasks[type] = [String(this.nextNextTaskId++), []]
    }
    tuple[1].push(ref)
    return tuple[0]
  }

  pauseRefTask(ref: ResourceRef, taskId: string) {
    this.nextPausedBy = this.nextPausedBy || {
      ...this.prevState.tasks.pausedBy,
    }
    this.nextQueue = this.nextQueue || { ...this.prevState.tasks.queue }

    const refKeys = this.nextPausedBy[taskId]
    if (refKeys) {
      this.nextPausedBy[taskId] = refKeys.concat(ref)
    } else {
      this.nextPausedBy[taskId] = [ref]
      this.nextQueue[taskId] = 'pause'
    }
  }

  removeRefsFromTasks(
    ref: ResourceRef,
    prevTasks: ResourceRefState<any, any>['tasks'],
    nextTasks?: ResourceRefState<any, any>['tasks'],
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
        const taskRefs = this.nextPending[taskId].refs
        const nextTaskRefs = removeRef(taskRefs, ref)
        if (nextTaskRefs !== taskRefs) {
          this.nextPending[taskId] = {
            ...this.prevState.tasks.pending[taskId],
            refs: nextTaskRefs,
          }

          if (nextTaskRefs.length === 0) {
            delete this.nextPending[taskId]
            delete this.nextPausedBy[taskId]
            this.nextQueue[taskId] = 'stop'
          } else {
            this.attemptToUnpauseTask(taskId, ref)
          }
        }
      }
    }
  }

  unpauseRefTask(ref: ResourceRef, taskId: string) {
    this.nextPausedBy = this.nextPausedBy || {
      ...this.prevState.tasks.pausedBy,
    }
    this.nextQueue = this.nextQueue || { ...this.prevState.tasks.queue }
    this.attemptToUnpauseTask(taskId, ref)
  }

  private attemptToUnpauseTask(taskId: string, ref: ResourceRef) {
    let pausedRefs = this.nextPausedBy![taskId]
    if (pausedRefs) {
      if (pausedRefs === this.prevState.tasks.pausedBy[taskId]) {
        this.nextPausedBy![taskId] = pausedRefs = pausedRefs.slice()
      }
      const nextPausedRefs = removeRef(pausedRefs, ref)
      if (nextPausedRefs.length === 0) {
        delete this.nextPausedBy![taskId]
        this.nextQueue![taskId] = 'start'
      } else {
        this.nextPausedBy![taskId] = nextPausedRefs
      }
    }
  }
}

function removeRef(
  refs: ResourceRef[],
  refToRemove: ResourceRef,
): ResourceRef[] {
  if (refs.length === 1) {
    if (refs[0][0] === refToRemove[0] && refs[0][1] === refToRemove[1]) {
      return []
    }
  } else {
    const index = refs.findIndex(
      pausedRef =>
        pausedRef[0] === refToRemove[0] && pausedRef[1] === refToRemove[1],
    )
    if (index !== -1) {
      const result = refs.slice()
      result.splice(index, 1)
      return result
    }
  }
  return refs
}
