import { Outlet } from '../../outlets'

import {
  ResourceAction,
  ResourceActionOfType,
  ResourceDataUpdater,
  ResourceQuery,
  CacheKey,
  ResourceState,
} from './types'

export class ResourceCacheActions<Data, Rejection> {
  constructor(
    private rawDispatch: (action: ResourceAction<Data, Rejection>) => void,
    private scope: string,
    private refs: readonly CacheKey[],
    private outlet: Outlet<ResourceState<Data, Rejection>>,
  ) {}

  applyModifier(modifier: 'keep' | 'pause' | 'pending') {
    let released = false
    this.dispatch('applyModifiers', {
      [modifier]: 1,
    })
    return () => {
      if (!released) {
        released = true
        this.dispatch('applyModifiers', {
          [modifier]: -1,
        })
      }
    }
  }

  invalidate() {
    this.dispatch('invalidate', { taskId: null })
  }

  load(query: ResourceQuery<any, Data, Rejection>) {
    // HACK ALERT. Even if multiple tasks are created, we know that task.nextId
    // will be the id of the manualLoad task, as the manualLoad reducer will
    // always create the manualLoad task before any other tasks.
    const taskId = String(this.outlet.getCurrentValue().tasks.nextId)
    let aborted = false
    this.dispatch('manualLoad', { query })
    return () => {
      if (!aborted) {
        aborted = true
        this.dispatch('abandonTask', { taskId })
      }
    }
  }

  setData(updates: Data | ResourceDataUpdater<Data>[]) {
    this.dispatch('updateValue', {
      taskId: null,
      timestamp: Date.now(),
      updates: this.refs.map(
        ([type, id], i) =>
          [
            type,
            id,
            {
              type: 'setData',
              update: updates[i],
            },
          ] as const,
      ),
    })
  }

  setRejection(rejection: Rejection) {
    this.dispatch('updateValue', {
      taskId: null,
      timestamp: Date.now(),
      updates: this.refs.map(
        ([type, id]) =>
          [
            type,
            id,
            {
              type: 'setRejection',
              rejection,
            },
          ] as const,
      ),
    })
  }

  private dispatch<T extends ResourceAction<any, any>['type']>(
    type: T,
    options: Omit<
      ResourceActionOfType<Data, Rejection, T>,
      'type' | 'scope' | 'refs'
    >,
  ) {
    this.rawDispatch({
      ...options,
      type,
      refs: this.refs,
      scope: this.scope,
    } as ResourceAction<Data, Rejection>)
  }
}
