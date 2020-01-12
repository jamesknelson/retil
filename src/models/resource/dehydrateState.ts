import { ResourceState } from './types'

export function dehydrateState<Data, Key>(
  state: ResourceState<Data, Key>,
): ResourceState<Data, Key> | undefined {
  if (state.error) {
    return
  }

  throw new Error('unimplemented')

  // TODO:
  // - zero hold/pause counts
  // - remove tasks from key states

  return {
    records: state.records,
    tasks: {
      nextId: 1,
      pausedBy: {},
      pending: {},
      queue: {},
    },
    valueChanges: null,
  }
}
