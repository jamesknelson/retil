import { ResourceState } from '../types'

export function reset<Data, Key>(
  state?: ResourceState<Data, Key>,
): ResourceState<Data, Key> {
  const { stoppers } = state ? state.tasks : { stoppers: {} }

  return {
    keys: {},
    paths: {},
    tasks: {
      nextId: 1,
      pending: {},
      stoppers,
      startQueue: [],
      stopQueue: Object.keys(stoppers).map(id => ({ id })),
    },
  }
}
