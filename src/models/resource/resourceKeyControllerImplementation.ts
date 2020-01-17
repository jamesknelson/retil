import { Outlet } from '../../outlets'

import {
  ResourceAction,
  ResourceActionOfType,
  ResourceKeyController,
  ResourcePrediction,
  ResourceState,
  ResourceUpdateCallback,
  ResourceValue,
} from './types'

export class ResourceKeyControllerImplementation<Data, Key>
  implements ResourceKeyController<Data, Key> {
  rawDispatch: (action: ResourceAction<Data, Key>) => void
  outlet: Outlet<ResourceState<Data, Key>>

  context: any
  path: string
  keys: Key[]

  constructor(
    dispatch: (action: ResourceAction<Data, Key>) => void,
    outlet: Outlet<ResourceState<Data, Key>>,
    context: any,
    path: string,
    keys: Key[],
  ) {
    this.rawDispatch = dispatch
    this.outlet = outlet

    this.context = context
    this.path = path
    this.keys = keys
  }

  delete() {
    const timestamp = Date.now()
    this.dispatch('update', {
      taskId: null,
      update: {
        timestamp,
        changes: this.keys.map(key => ({
          key,
          value: {
            status: 'inaccessible' as const,
            reason: 'Not Found',
            timestamp,
          },
        })),
      },
    })
  }

  revalidate() {
    this.dispatch('expire', { taskId: null })
  }

  hold() {
    let released = false
    this.dispatch('hold')
    return () => {
      if (!released) {
        released = true
        this.dispatch('releaseHold')
      }
    }
  }

  load() {
    // HACK ALERT. Even if multiple tasks are created, we know that task.nextId
    // will be the id of the forceLoad task, as the forceLoad reducer will
    // always create the forceLoad task before any other tasks.
    const taskId = String(this.outlet.getCurrentValue().tasks.nextId)
    let aborted = false
    this.dispatch('forceLoad')
    return () => {
      if (!aborted) {
        aborted = true
        this.dispatch('abortForceLoad', { taskId })
      }
    }
  }

  pause() {
    let released = false
    this.dispatch('pause')
    return () => {
      if (!released) {
        released = true
        this.dispatch('resumePause')
      }
    }
  }

  predictDelete(): [() => void, () => void] {
    const [commit, discard] = this.predict({
      type: 'delete',
    })
    const commitDelete = () => {
      const timestamp = Date.now()
      const value = {
        status: 'inaccessible' as const,
        reason: 'Not Found',
        timestamp,
      }
      commit(timestamp, value)
    }
    return [commitDelete, discard]
  }

  predictUpdate(
    originalUpdater?: Data | ResourceUpdateCallback<Data, Key>,
  ): [
    (commitUpdater?: Data | ResourceUpdateCallback<Data, Key>) => void,
    () => void,
  ] {
    const [commit, discard] = this.predict({
      type: 'update',
      callback: originalUpdater,
    })
    const commitUpdate = (
      commitUpdater?: Data | ResourceUpdateCallback<Data, Key>,
    ) => {
      const timestamp = Date.now()
      const updater = commitUpdater || originalUpdater
      const value =
        typeof updater === 'function'
          ? (updater as ResourceUpdateCallback<Data, Key>)
          : {
              status: 'retrieved' as const,
              data: updater!,
              timestamp,
            }
      commit(timestamp, value)
    }
    return [commitUpdate, discard]
  }

  update(updater: Data | ResourceUpdateCallback<Data, Key>) {
    const timestamp = Date.now()
    const value =
      typeof updater === 'function'
        ? (updater as ResourceUpdateCallback<Data, Key>)
        : {
            status: 'retrieved' as const,
            data: updater,
            timestamp,
          }
    this.dispatch('update', {
      taskId: null,
      update: {
        timestamp,
        changes: this.keys.map(key => ({
          key,
          value,
        })),
      },
    })
  }

  private dispatch<T extends ResourceAction<any, any>['type']>(
    type: T,
    options?: Omit<
      ResourceActionOfType<Data, Key, T>,
      'type' | 'context' | 'path' | 'keys'
    >,
  ) {
    this.rawDispatch({
      ...options,
      type,
      context: this.context,
      path: this.path,
      keys: this.keys,
    } as ResourceAction<Data, Key>)
  }

  private predict(
    prediction: ResourcePrediction<Data, Key>,
  ): [
    (
      timestamp?: number,
      value?: ResourceValue<Data> | ResourceUpdateCallback<Data, Key>,
    ) => void,
    () => void,
  ] {
    let released = false

    this.dispatch('predict', {
      prediction,
    })

    const resolvePrediction = (
      timestamp?: number,
      value?: ResourceValue<Data> | ResourceUpdateCallback<Data, Key>,
    ) => {
      if (!released) {
        released = true
        this.dispatch('resolvePrediction', {
          prediction,
          update: value && {
            timestamp: timestamp!,
            changes: this.keys.map(key => ({
              key,
              value,
            })),
          },
        })
      }
    }
    const discardPrediction = () => resolvePrediction()

    return [resolvePrediction, discardPrediction]
  }
}
