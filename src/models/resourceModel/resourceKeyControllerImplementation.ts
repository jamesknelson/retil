import { Outlet } from '../../outlets'

import {
  ResourceAction,
  ResourceActionOfType,
  ResourceDataUpdate,
  ResourceDocController,
  ResourceState,
} from './types'

export class ResourceKeyControllerImplementation<Data, Key>
  implements ResourceDocController<Data, Key> {
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

  invalidate() {
    this.dispatch('invalidate', { taskId: null })
  }

  keep() {
    let released = false
    this.dispatch('holdPolicies', {
      policies: ['keep'],
    })
    return () => {
      if (!released) {
        released = true
        this.dispatch('releasePolicies', {
          policies: ['keep'],
        })
      }
    }
  }

  load() {
    // HACK ALERT. Even if multiple tasks are created, we know that task.nextId
    // will be the id of the manualLoad task, as the manualLoad reducer will
    // always create the manualLoad task before any other tasks.
    const taskId = String(this.outlet.getCurrentValue().tasks.nextId)
    let aborted = false
    this.dispatch('manualLoad')
    return () => {
      if (!aborted) {
        aborted = true
        this.dispatch('abandonTask', { taskId })
      }
    }
  }

  pause(expectingExternalUpdate = false) {
    const policies = [
      expectingExternalUpdate
        ? ('expectingExternalUpdate' as const)
        : ('pauseLoad' as const),
    ]
    let released = false
    this.dispatch('holdPolicies', { policies })
    return () => {
      if (!released) {
        released = true
        this.dispatch('releasePolicies', { policies })
      }
    }
  }

  setData(update: ResourceDataUpdate<Data, Key>) {
    this.dispatch('updateValue', {
      taskId: null,
      timestamp: Date.now(),
      updates: {
        [this.path]: this.keys.map(
          key =>
            [
              key,
              {
                type: 'setData',
                update,
              },
            ] as const,
        ),
      },
    })
  }

  setRejection(rejection: string) {
    this.dispatch('updateValue', {
      taskId: null,
      timestamp: Date.now(),
      updates: {
        [this.path]: this.keys.map(
          key =>
            [
              key,
              {
                type: 'setRejection',
                rejection,
              },
            ] as const,
        ),
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
}
