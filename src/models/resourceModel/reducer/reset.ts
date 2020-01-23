import { fromEntries } from '../../../utils'

import { ResourceState } from '../types'

export function reset<Id>(
  state?: ResourceState<any, any, Id>,
): ResourceState<any, any, Id> {
  const { pending, nextId } = state ? state.tasks : { pending: {}, nextId: 1 }

  return {
    effects: [],
    scopes: {},
    tasks: {
      nextId,
      pending: {},
      pausedBy: {},
      queue: fromEntries(Object.keys(pending).map(key => [key, 'stop'])),
    },
  }
}
