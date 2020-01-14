import { ResourceKeyState, ResourceTaskType } from '../types'

export const TaskTypes: ResourceTaskType[] = [
  'expire',
  'forceLoad',
  'load',
  'purge',
  'subscribe',
]

export const InitialKeyState: Omit<ResourceKeyState<any, any>, 'key'> = {
  holdCount: 0,
  pauseCount: 0,
  predictions: [],
  requestPolicies: {
    fetchStale: 0,
    fetchOnce: 0,
    subscribe: 0,
  },
  tasks: {
    expire: null,
    forceLoad: null,
    load: null,
    purge: null,
    subscribe: null,
  },
  value: null,
}
