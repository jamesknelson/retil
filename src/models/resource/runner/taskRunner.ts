import AbortController from 'abort-controller'

import {
  ResourceAction,
  ResourceTask,
  ResourceTaskConfig,
  ResourceUpdate,
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
    if (task.type === 'forceLoad') {
      this.fetch(task)
    }
    this[task.type](task)
  }

  stop(task: ResourceTask<Data, Key, Context>) {
    const stopper = this.stoppers[task.id]
    if (stopper) {
      delete this.stoppers[task.id]
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

  private expire(task: ResourceTask<Data, Key, Context>) {
    if (this.config.expire) {
      const expire = (keys: Key[] = task.keys) => {
        this.dispatch({
          ...task,
          keys,
          type: 'expire',
          taskId: task.id,
        })
      }
      const markAsEvergreen = (keys: Key[] = task.keys) => {
        this.dispatch({
          ...task,
          keys,
          type: 'markAsEvergreen',
          taskId: task.id,
        })
      }

      try {
        const stopper = this.config.expire({
          ...task,
          expire,
          markAsEvergreen,
        })

        if (stopper) {
          this.stoppers[task.id] = stopper
        } else {
          console.warn(
            'Resource Warning: an expire task did not return a cleanup function.',
          )
        }
      } catch (error) {
        this.error(error)
      }
    }
  }

  private fetch(task: ResourceTask<Data, Key, Context>) {
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
      const update = (update: ResourceUpdate<Data, Key>) => {
        if (this.stoppers[task.id]) {
          if (!update.timestamp) {
            update.timestamp = Date.now()
          }
          this.dispatch({
            ...task,
            type: 'update',
            taskId: task.id,
            update,
          })
        }
      }

      const abortController = new AbortController()

      try {
        const stopper = this.config.load({
          ...task,
          abandon,
          error: this.error,
          update,
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
      const update = (update: ResourceUpdate<Data, Key>) => {
        if (!update.timestamp) {
          update.timestamp = Date.now()
        }
        this.dispatch({
          ...task,
          type: 'update',
          taskId: task.id,
          update,
        })
      }

      try {
        const stopper = this.config.subscribe({
          ...task,
          abandon,
          error: this.error,
          update,
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
