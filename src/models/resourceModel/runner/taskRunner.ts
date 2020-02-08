import {
  ResourceAction,
  ResourceCacheTask,
  ResourceRequestTask,
  CacheKey,
  ResourceSchema,
  ResourceTask,
  ResourceTaskConfig,
  ResourceUpdate,
} from '../types'

export class ResourceTaskRunner<Schema extends ResourceSchema> {
  private config: ResourceTaskConfig<Schema>
  private dispatch: (action: ResourceAction<Schema>) => void
  private stoppers: { [taskId: string]: () => void }

  constructor(
    config: ResourceTaskConfig<Schema>,
    dispatch: (action: ResourceAction<Schema>) => void,
  ) {
    this.config = config
    this.dispatch = dispatch
    this.stoppers = {}
  }

  start(task: ResourceTask<Schema>) {
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

  private invalidate(task: ResourceCacheTask<Schema>) {
    if (this.config.invalidate) {
      let running = false

      const invalidate = (refs: CacheKey<keyof Schema>[] = task.refs) => {
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

  private load(task: ResourceRequestTask<Schema>) {
    if (task.query.load) {
      try {
        const stopper = task.query.load({
          ...task,
          abandon: this.handleAbandon.bind(this, task),
          error: this.handleError,
          update: this.handleUpdate.bind(this, task),
        })

        this.stoppers[task.taskId] = () => {
          if (stopper) {
            stopper()
          }
        }
      } catch (error) {
        this.handleError(error)
      }
    }
  }

  private purge(task: ResourceCacheTask<Schema>) {
    if (this.config.purge) {
      const purge = (refs: CacheKey<keyof Schema>[] = task.refs) => {
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

  private subscribe(task: ResourceRequestTask<Schema>) {
    if (task.query.subscribe) {
      try {
        const stopper = task.query.subscribe({
          ...task,
          abandon: this.handleAbandon.bind(this, task),
          error: this.handleError,
          update: this.handleUpdate.bind(this, task),
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

  private handleAbandon(task: ResourceTask<Schema>) {
    this.dispatch({
      ...task,
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

  private handleUpdate(
    task: ResourceRequestTask<Schema>,
    updates: ResourceUpdate<Schema, keyof Schema>[],
  ) {
    if (this.stoppers[task.taskId]) {
      this.dispatch({
        ...task,
        type: 'updateValue',
        taskId: task.taskId,
        updates,
        timestamp: Date.now(),
      })
    }
  }
}
