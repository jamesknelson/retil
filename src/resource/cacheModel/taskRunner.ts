import {
  ChunkList,
  PointerList,
  CacheReducerAction,
  ResourceCacheTask,
  ResourceRequestTask,
  ResourceTask,
  ResourceTaskConfig,
} from '../types'

export class ResourceTaskRunner {
  private config: ResourceTaskConfig
  private dispatch: (action: CacheReducerAction) => void
  private stoppers: { [taskId: string]: () => void }

  constructor(
    config: ResourceTaskConfig,
    dispatch: (action: CacheReducerAction) => void,
  ) {
    this.config = config
    this.dispatch = dispatch
    this.stoppers = {}
  }

  start(task: ResourceTask) {
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

  private invalidate(task: ResourceCacheTask) {
    if (this.config.invalidate) {
      let running = false

      const invalidate = (pointers: PointerList = task.pointers) => {
        if (running) {
          throw new Error(
            'Resource Error: an invalidator called its invalidate function ' +
              "synchronously. Invalidation must happen asynchronously - you'll " +
              'probably want some minimum time between invalidations.',
          )
        }
        this.dispatch({
          ...task,
          pointers,
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

  private load(task: ResourceRequestTask) {
    if (task.request.load) {
      try {
        const stopper = task.request.load({
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

  private purge(task: ResourceCacheTask) {
    if (this.config.purge) {
      const purge = (pointers: PointerList = task.pointers) => {
        // Always purge asynchronously
        setTimeout(() => {
          this.dispatch({
            ...task,
            pointers,
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

  private subscribe(task: ResourceRequestTask) {
    if (task.request.subscribe) {
      try {
        const stopper = task.request.subscribe({
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

  private handleAbandon(task: ResourceTask) {
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

  private handleUpdate(task: ResourceRequestTask, chunks: ChunkList) {
    if (this.stoppers[task.taskId]) {
      this.dispatch({
        ...task,
        type: 'updateValue',
        taskId: task.taskId,
        chunks,
        timestamp: Date.now(),
      })
    }
  }
}
