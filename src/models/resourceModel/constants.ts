import { ResourceRefState, ResourceTaskType } from './types'

export const TaskTypes: ResourceTaskType[] = [
  'invalidate',
  'manualLoad',
  'load',
  'purge',
  'subscribe',
]

export const DefaultModifierPolicies = {
  keep: 0,
  expectingExternalUpdate: 0,
  pauseLoad: 0,
}

export const DefaultRequestPolicies = {
  loadInvalidated: 0,
  loadOnce: 0,
  subscribe: 0,
}

export const InitialDocState: Omit<ResourceRefState<any, any>, 'ref'> = {
  modifierPolicies: DefaultModifierPolicies,
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
