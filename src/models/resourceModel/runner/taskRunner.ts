import AbortController from 'abort-controller'

import { fromEntries } from '../../../utils/fromEntries'

import {
  ResourceAction,
  ResourceCacheTask,
  ResourceDataUpdate,
  ResourceNetworkTask,
  ResourceRef,
  ResourceTask,
  ResourceTaskConfig,
} from '../types'

export class ResourceTaskRunner<Props extends object, Data, Rejection, Id> {
  private config: ResourceTaskConfig<Props, Data, Rejection, Id>
  private dispatch: (action: ResourceAction<Data, Rejection, Id>) => void
  private stoppers: { [taskId: string]: () => void }

  constructor(
    config: ResourceTaskConfig<Props, Data, Rejection, Id>,
    dispatch: (action: ResourceAction<Data, Rejection, Id>) => void,
  ) {
    this.config = config
    this.dispatch = dispatch
    this.stoppers = {}
  }

  start(task: ResourceTask<Props, Data, Rejection, Id>) {
    switch (task.type) {
      case 'invalidate':
        return this.invalidate(task)
      case 'load':
      case 'manualLoad':
        return this.load(task)
      case 'purge':
        return this.purge(task)
      case 'subscribe':
        return this.subscribe(task)
    }
  }

  stop(taskId: string) {
    const stopper = this.stoppers[taskId]
    if (stopper) {
      delete this.stoppers[taskId]
      try {
        stopper()
      } catch (error) {
        this.handleError(error)
      }
    }
  }

  private invalidate(task: ResourceCacheTask<Props, Data, Rejection, Id>) {
    if (this.config.invalidate) {
      let running = false

      const invalidate = (refs: ResourceRef<Id>[] = task.refs) => {
        if (running) {
          throw new Error(
            'Resource Error: an invalidator called its invalidate function ' +
              "synchronously. Invalidation must happen asynchronously - you'll " +
              'probably want some minimum time between invalidations.',
          )
        }
        this.dispatch({
          ...task,
          refs,
          type: 'invalidate',
          taskId: task.taskId,
        })
      }

      try {
        running = true
        const stopper = this.config.invalidate({
          ...task,
          invalidate,
          abandon: this.handleAbandon.bind(this, task),
        })
        running = false

        if (stopper) {
          this.stoppers[task.taskId] = stopper
        } else {
          console.warn(
            'Resource Warning: an invalidator task did not return ' +
              "a cleanup function. If you don't want to invalidate your " +
              "resources, set your resource's `purger` to `null` instead.",
          )
        }
      } catch (error) {
        this.handleError(error)
      }
    }
  }

  private load(task: ResourceNetworkTask<Props, Id>) {
    if (this.config.load) {
      const abortController = new AbortController()

      try {
        const stopper = this.config.load({
          ...task,
          abandon: this.handleAbandon.bind(this, task),
          error: this.handleError,
          setData: this.handleSetData.bind(this, task),
          setRejection: this.handleSetRejection.bind(this, task),
          signal: abortController.signal,
        })

        this.stoppers[task.taskId] = () => {
          if (stopper) {
            stopper()
          }
          abortController.abort()
        }
      } catch (error) {
        this.handleError(error)
      }
    }
  }

  private purge(task: ResourceCacheTask<Props, Data, Rejection, Id>) {
    if (this.config.purge) {
      const purge = (refs: ResourceRef<Id>[] = task.refs) => {
        // Always purge asynchronously
        setTimeout(() => {
          this.dispatch({
            ...task,
            refs,
            type: 'purge',
            taskId: task.taskId,
          })
        })
      }

      try {
        const stopper = this.config.purge({
          ...task,
          purge,
        })

        if (stopper) {
          this.stoppers[task.taskId] = stopper
        } else {
          console.warn(
            'Resource Warning: a purge task did not return a cleanup function. ' +
              "If you don't want to purge your data, set your resource's " +
              'purger task to "null" instead. But beware - this can lead to ' +
              'memory leaks.',
          )
        }
      } catch (error) {
        this.handleError(error)
      }
    }
  }

  private subscribe(task: ResourceNetworkTask<Props, Id>) {
    if (this.config.subscribe) {
      try {
        const stopper = this.config.subscribe({
          ...task,
          abandon: this.handleAbandon.bind(this, task),
          error: this.handleError,
          setData: this.handleSetData.bind(this, task),
          setRejection: this.handleSetRejection.bind(this, task),
          signal: undefined,
        })

        if (!stopper) {
          throw new Error(
            'Resource Error: subscribe tasks must return a cleanup function.',
          )
        }

        this.stoppers[task.taskId] = stopper
      } catch (error) {
        this.handleError(error)
      }
    }
  }

  private handleAbandon(
    task: ResourceTask<Props, Data, Rejection, Id>,
    refs?: ResourceRef<Id>[],
  ) {
    this.dispatch({
      ...task,
      refs: refs || task.refs,
      type: 'abandonTask',
      taskId: task.taskId,
    })
  }

  private handleError = (error: any) => {
    this.dispatch({
      type: 'error',
      error,
    })
  }

  private handleSetData(
    task: ResourceNetworkTask<Props, Id>,
    updates:
      | ((data: Data | undefined, id: Id, type: string) => Data)
      | (readonly [string, Id, ResourceDataUpdate<Data, Id>])[],
  ) {
    if (this.stoppers[task.taskId]) {
      const pathUpdates = Array.isArray(updates)
        ? { [task.collection]: updates }
        : updates
      const paths = Object.keys(pathUpdates)
      this.dispatch({
        ...task,
        type: 'updateValue',
        taskId: task.taskId,
        updates: fromEntries(
          paths.map(path => [
            path,
            pathUpdates[path].map(([key, update]) => [
              key,
              {
                type: 'setData',
                update,
              },
            ]),
          ]),
        ),
        timestamp: Date.now(),
      })
    }
  }

  private handleSetRejection(
    task: ResourceNetworkTask<Props, Id>,
    rejections:
      | ((id: Id, type: string) => Rejection)
      | (readonly [string, Id, Rejection])[],
  ) {
    if (this.stoppers[task.taskId]) {
      this.dispatch({
        ...task,
        type: 'updateValue',
        taskId: task.taskId,
        updates: {
          [task.collection]: rejections.map(([id, rejection]) => [
            id,
            {
              type: 'setRejection',
              rejection,
            },
          ]),
        },
        timestamp: Date.now(),
      })
    }
  }
}
