import { CachePointerState, ResourceTaskType } from '../types'

export const TaskTypes: ResourceTaskType[] = [
  'invalidate',
  'manualLoad',
  'load',
  'purge',
  'subscribe',
]

export const DefaultRequestPolicies = {
  loadInvalidated: 0,
  loadOnce: 0,
  subscribe: 0,
}

export const InitialPointerState: Omit<CachePointerState, 'pointer'> = {
  modifiers: {
    keep: 0,
    pause: 0,
    pending: 0,
  },
  request: null,
  tasks: {
    manualLoad: null,
    invalidate: null,
    load: null,
    purge: null,
    subscribe: null,
  },
  value: null,
}
