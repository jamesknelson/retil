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
    keys: state.keys,
    tasks: {
      nextId: 1,
      pending: {},
      startQueue: [],
      stopQueue: [],
      stoppers: {},
    },
  }
}
