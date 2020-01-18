import { ResourceKeyState, ResourceTaskType } from './types'

export const TaskTypes: ResourceTaskType[] = [
  'invalidate',
  'manualLoad',
  'load',
  'purge',
  'subscribe',
]

export const InitialKeyState: Omit<ResourceKeyState<any, any>, 'key'> = {
  holdCount: 0,
  pauseCount: 0,
  requestPolicies: {
    loadInvalidated: 0,
    loadOnce: 0,
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
