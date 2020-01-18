import AbortController from 'abort-controller'

import {
  ResourceAction,
  ResourceDataUpdate,
  ResourceTask,
  ResourceTaskConfig,
  ResourceTaskType,
  ResourceValueUpdate,
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
    }
    this[task.type as Exclude<ResourceTaskType, 'manualLoad'>](task)
  }

  stop(taskId: string) {
    const stopper = this.stoppers[taskId]
    if (stopper) {
      delete this.stoppers[taskId]
      try {
        stopper()
      } catch (error) {
        this.error(error)
      }
    }
  }

  private error = (error: any) => {
    this.dispatch({
      type: 'error',
      error,
    })
  }

  private invalidate(task: ResourceTask<Data, Key, Context>) {
    if (this.config.invalidate) {
      const invalidate = (keys: Key[] = task.keys) => {
        this.dispatch({
          ...task,
          keys,
          type: 'invalidate',
          taskId: task.id,
        })
      }
      const abandon = (keys: Key[] = task.keys) => {
        this.dispatch({
          ...task,
          keys,
          type: 'abandonInvalidation',
          taskId: task.id,
        })
      }

      try {
        const stopper = this.config.invalidate({
          ...task,
          invalidate,
          abandon,
        })

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
        this.error(error)
      }
    }
  }

  private load(task: ResourceTask<Data, Key, Context>) {
    if (this.config.load) {
      const abandon = (keys: Key[] = task.keys) => {
        if (this.stoppers[task.id]) {
          this.dispatch({
            ...task,
            keys,
            type: 'abandonLoad',
            taskId: task.id,
          })
        }
      }
      const setValue = (
        updates: (readonly [Key, ResourceValueUpdate<Data, Key>])[],
      ) => {
        if (this.stoppers[task.id]) {
          this.dispatch({
            ...task,
            type: 'updateValue',
            taskId: task.id,
            updates,
            timestamp: Date.now(),
          })
        }
      }
      const setData = (
        updates: (readonly [Key, ResourceDataUpdate<Data, Key>])[],
      ) => {
        setValue(
          updates.map(([key, update]) => [
            key,
            {
              type: 'setData',
              update,
            },
          ]),
        )
      }
      const setRejection = (rejections: (readonly [Key, string])[]) => {
        setValue(
          rejections.map(([key, rejection]) => [
            key,
            {
              type: 'setRejection',
              rejection,
            },
          ]),
        )
      }

      const abortController = new AbortController()

      try {
        const stopper = this.config.load({
          ...task,
          abandon,
          error: this.error,
          setData,
          setRejection,
          signal: abortController.signal,
        })

        this.stoppers[task.id] = () => {
          if (stopper) {
            stopper()
          }
          abortController.abort()
        }
      } catch (error) {
        this.error(error)
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
        this.error(error)
      }
    }
  }

  private subscribe(task: ResourceTask<Data, Key, Context>) {
    if (this.config.subscribe) {
      const abandon = (keys: Key[] = task.keys) => {
        this.dispatch({
          ...task,
          keys,
          type: 'abandonSubscribe',
          taskId: task.id,
        })
      }
      const setValue = (
        updates: (readonly [Key, ResourceValueUpdate<Data, Key>])[],
      ) => {
        if (this.stoppers[task.id]) {
          this.dispatch({
            ...task,
            type: 'updateValue',
            taskId: task.id,
            updates,
            timestamp: Date.now(),
          })
        }
      }
      const setData = (
        updates: (readonly [Key, ResourceDataUpdate<Data, Key>])[],
      ) => {
        setValue(
          updates.map(([key, update]) => [
            key,
            {
              type: 'setData',
              update,
            },
          ]),
        )
      }
      const setRejection = (rejections: (readonly [Key, string])[]) => {
        setValue(
          rejections.map(([key, rejection]) => [
            key,
            {
              type: 'setRejection',
              rejection,
            },
          ]),
        )
      }

      try {
        const stopper = this.config.subscribe({
          ...task,
          abandon: abandon,
          error: this.error,
          setData,
          setRejection,
          signal: undefined,
        })

        if (!stopper) {
          throw new Error(
            'Resource Error: subscribe tasks must return a cleanup function.',
          )
        }

        this.stoppers[task.id] = stopper
      } catch (error) {
        this.error(error)
      }
    }
  }
}
