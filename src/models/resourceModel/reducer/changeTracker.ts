import {
  ResourceDocState,
  ResourceEffect,
  ResourceQuery,
  ResourceRef,
  ResourceState,
  ResourceTaskType,
  ResourceValue,
} from '../types'

import { TaskTypes } from '../constants'

export class ChangeTracker<Data, Rejection, Id> {
  private cacheEffects: ResourceEffect<any, Data, Rejection, Id>[]

  private nextNextTaskId: number
  private nextPausedBy: { [taskId: string]: ResourceRef<Id>[] } | undefined
  private nextPending:
    | ResourceState<Data, Rejection, Id>['tasks']['pending']
    | undefined
  private nextQueue:
    | ResourceState<Data, Rejection, Id>['tasks']['queue']
    | undefined

  private startedTasks: {
    [Type in ResourceTaskType]?: readonly [
      /* taskId */ string,
      ResourceRef<Id>[],
    ]
  }

  constructor(
    private readonly prevState: ResourceState<Data, Rejection, Id>,
    private scope: string,
    private props?: any,
    private query?: ResourceQuery<Id>,
  ) {
    this.cacheEffects = []
    this.nextNextTaskId = prevState.tasks.nextId
    this.startedTasks = {}
  }

  buildNextState(
    nextRecords: ResourceState<Data, Rejection, Id>['scopes'],
  ): ResourceState<Data, Rejection, Id> {
    const prevState = this.prevState

    let nextEffects = prevState.effects
    if (this.cacheEffects.length) {
      nextEffects = prevState.effects.concat(this.cacheEffects)
    }

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
      const types = Object.keys(this.startedTasks) as ResourceTaskType[]
      for (let i = 0; i < types.length; i++) {
        const type = types[i]
        const [taskId, refs] = this.startedTasks[type]!
        const taskBase = {
          props: this.props,
          scope: this.scope,
          refs,
          taskId,
        }
        nextTasks.queue[taskId] = 'start'
        nextTasks.pending[taskId] =
          type === 'invalidate' || type === 'purge'
            ? {
                ...taskBase,
                type,
                states: [],
              }
            : {
                ...taskBase,
                type,
                query: this.query!,
              }
      }
    }

    return {
      ...prevState,
      effects: nextEffects,
      scopes: nextRecords,
      tasks: nextTasks,
    }
  }

  recordCacheEffect(
    [type, id]: ResourceRef<Id>,
    value: ResourceValue<Data, Rejection> | null | undefined,
  ) {
    this.cacheEffects.push({
      props: this.props,
      scope: this.scope,
      type,
      id,
      value,
    })
  }

  /**
   * Returns the taskId that the doc was added to
   */
  startTasks(type: ResourceTaskType, ref: ResourceRef<Id>): string {
    let pair = this.startedTasks[type]
    if (!pair) {
      pair = this.startedTasks[type] = [String(this.nextNextTaskId++), []]
    }
    pair[1].push(ref)
    return pair[0]
  }

  pauseDocTask(ref: ResourceRef<Id>, taskId: string) {
    this.nextPausedBy = this.nextPausedBy || {
      ...this.prevState.tasks.pausedBy,
    }
    this.nextQueue = this.nextQueue || { ...this.prevState.tasks.queue }

    const docIds = this.nextPausedBy[taskId]
    if (docIds) {
      this.nextPausedBy[taskId] = docIds.concat(ref)
    } else {
      this.nextPausedBy[taskId] = [ref]
      this.nextQueue[taskId] = 'pause'
    }
  }

  removeDocsFromTasks(
    ref: ResourceRef<Id>,
    prevTasks: ResourceDocState<any, any, any>['tasks'],
    nextTasks?: ResourceDocState<any, any, any>['tasks'],
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
        let docRefs = this.nextPending[taskId].refs
        if (docRefs === this.prevState.tasks.pending[taskId].refs) {
          docRefs = docRefs.slice()
          this.nextPending[taskId] = {
            ...this.prevState.tasks.pending[taskId],
            refs: docRefs,
          }
        }

        if (
          docRefs.length === 1 &&
          docRefs[0][0] === ref[0] &&
          docRefs[0][1] === ref[1]
        ) {
          delete this.nextPending[taskId]
          delete this.nextPausedBy[taskId]
          this.nextQueue[taskId] = 'stop'
        } else {
          const index = docRefs.indexOf(docId)
          if (index !== -1) {
            docRefs.splice(index, 1)
          }
          this.attemptToUnpauseTask(taskId, ref)
        }
      }
    }
  }

  unpauseDocTask(ref: ResourceRef<Id>, taskId: string) {
    this.nextPausedBy = this.nextPausedBy || {
      ...this.prevState.tasks.pausedBy,
    }
    this.nextQueue = this.nextQueue || { ...this.prevState.tasks.queue }
    this.attemptToUnpauseTask(taskId, ref)
  }

  private attemptToUnpauseTask(taskId: string, ref: ResourceRef<Id>) {
    let refs = this.nextPausedBy![taskId]
    if (refs) {
      if (refs === this.prevState.tasks.pausedBy[taskId]) {
        this.nextPausedBy![taskId] = refs = refs.slice()
      }
      if (refs.length === 1 && refs[0] === docId) {
        delete this.nextPausedBy![taskId]
        this.nextQueue![taskId] = 'start'
      } else {
        const index = refs.indexOf(docId)
        if (index !== -1) {
          refs.splice(index, 1)
        }
      }
    }
  }
}
