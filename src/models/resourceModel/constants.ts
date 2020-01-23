import { ResourceDocState, ResourceTaskType } from './types'

export const TaskTypes: ResourceTaskType[] = [
  'invalidate',
  'manualLoad',
  'load',
  'purge',
  'subscribe',
]

export const InitialDocState: Omit<ResourceDocState<any, any, any>, 'id'> = {
  policies: {
    expectingExternalUpdate: 0,
    keep: 0,
    loadInvalidated: 0,
    loadOnce: 0,
    pauseLoad: 0,
    subscribe: 0,
  },
  tasks: {
    manualLoad: null,
    invalidate: null,
    load: null,
    purge: null,
    subscribe: null,
  },
  value: null,
}
