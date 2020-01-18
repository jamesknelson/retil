import AbortController from 'abort-controller'

import { fromEntries } from '../../../utils/fromEntries'

import {
  ResourceAction,
  ResourceDataUpdate,
  ResourceTask,
  ResourceTaskConfig,
  ResourceTaskType,
} from '../types'

export class ResourceTaskRunner<Data, Key, Context extends object> {
  private config: ResourceTaskConfig<Data, Key, Context>
  private dispatch: (action: ResourceAction<Data, Key>) => void
  private stoppers: { [taskId: string]: () => void }

  constructor(
    config: ResourceTaskConfig<Data, Key, Context>,
    dispatch: (action: ResourceAction<Data, Key>) => void,
  ) {
    this.config = config
    this.dispatch = dispatch
    this.stoppers = {}
  }

  start(task: ResourceTask<Data, Key, Context>) {
    if (task.type === 'manualLoad') {
      this.load(task)
    } else {
      this[task.type](task)
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

  private invalidate(task: ResourceTask<Data, Key, Context>) {
    if (this.config.invalidate) {
      let running = false

      const invalidate = (keys: Key[] = task.keys) => {
        if (running) {
          throw new Error(
            'Resource Error: an invalidator called its invalidate function ' +
              "synchronously. Invalidation must happen asynchronously - you'll " +
              'probably want some minimum time between invalidations.',
          )
        }
        this.dispatch({
          ...task,
          keys,
          type: 'invalidate',
          taskId: task.id,
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
          this.stoppers[task.id] = stopper
        } else {
          console.warn(
            'Resource Warning: an invalidation scheduler task did not return ' +
              "a cleanup function. If you don't want to invalidate your " +
              'resources, set the invalidation scheduler to `null` instead.',
          )
        }
      } catch (error) {
        this.handleError(error)
      }
    }
  }

  private load(task: ResourceTask<Data, Key, Context>) {
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

        this.stoppers[task.id] = () => {
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

  private purge(task: ResourceTask<Data, Key, Context>) {
    if (this.config.purge) {
      const purge = (keys: Key[] = task.keys) => {
        // Always purge asynchronously
        setTimeout(() => {
          this.dispatch({
            ...task,
            keys,
            type: 'purge',
            taskId: task.id,
          })
        })
      }

      try {
        const stopper = this.config.purge({
          ...task,
          purge,
        })

        if (stopper) {
          this.stoppers[task.id] = stopper
        } else {
          console.warn(
            'Resource Warning: a purge task did not return a cleanup function.',
          )
        }
      } catch (error) {
        this.handleError(error)
      }
    }
  }

  private subscribe(task: ResourceTask<Data, Key, Context>) {
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

        this.stoppers[task.id] = stopper
      } catch (error) {
        this.handleError(error)
      }
    }
  }

  private handleAbandon(task: ResourceTask<Data, Key, Context>, keys?: Key[]) {
    this.dispatch({
      ...task,
      keys: keys || task.keys,
      type: 'abandonTask',
      taskId: task.id,
    })
  }

  private handleError = (error: any) => {
    this.dispatch({
      type: 'error',
      error,
    })
  }

  private handleSetData(
    task: ResourceTask<Data, Key, Context>,
    updates:
      | (readonly [Key, ResourceDataUpdate<Data, Key>])[]
      | {
          [path: string]: (readonly [Key, ResourceDataUpdate<Data, Key>])[]
        },
  ) {
    if (this.stoppers[task.id]) {
      const pathUpdates = Array.isArray(updates)
        ? { [task.path]: updates }
        : updates
      const paths = Object.keys(pathUpdates)
      this.dispatch({
        ...task,
        type: 'updateValue',
        taskId: task.id,
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
    task: ResourceTask<Data, Key, Context>,
    rejections: (readonly [Key, string])[],
  ) {
    if (this.stoppers[task.id]) {
      this.dispatch({
        ...task,
        type: 'updateValue',
        taskId: task.id,
        updates: {
          [task.path]: rejections.map(([key, rejection]) => [
            key,
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
