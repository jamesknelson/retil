import { fromEntries } from '../../../utils'

import { ResourceState } from '../types'

export function reset<Data, Key>(
  state?: ResourceState<Data, Key>,
): ResourceState<Data, Key> {
  const { pending, nextId } = state ? state.tasks : { pending: {}, nextId: 1 }

  return {
    effects: [],
    records: {},
    tasks: {
      nextId,
      pending: {},
      pausedBy: {},
      queue: fromEntries(Object.keys(pending).map(key => [key, 'stop'])),
    },
  }
}
