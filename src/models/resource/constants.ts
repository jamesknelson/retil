import { ResourceKeyState, ResourceTaskType } from './types'

export const TaskTypes: ResourceTaskType[] = [
  'expire',
  'fetch',
  'purge',
  'subscribe',
]

export const InitialKeyState: Omit<ResourceKeyState<any, any>, 'key'> = {
  holdCount: 0,
  pauseCount: 0,
  predictions: [],
  requestPolicies: {
    fetchExpired: 0,
    fetchManual: 0,
    fetchOnce: 0,
    subscribe: 0,
  },
  tasks: {
    expire: null,
    fetch: null,
    purge: null,
    subscribe: null,
  },
  value: null,
}
