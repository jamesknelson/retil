import { fromEntries } from '../../../utils'

import { ResourceState } from '../types'

export function reset(
  state?: ResourceState<any, any>,
): ResourceState<any, any> {
  const { pending, nextId } = state ? state.tasks : { pending: {}, nextId: 1 }

  return {
    scopes: {},
    tasks: {
      nextId,
      pending: {},
      pausedBy: {},
      queue: fromEntries(Object.keys(pending).map(key => [key, 'stop'])),
    },
  }
}
