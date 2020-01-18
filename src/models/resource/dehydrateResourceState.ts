import { InitialKeyState } from './constants'
import { ResourceState } from './types'

import { fromEntries } from '../../utils'

export function dehydrateResourceState<Data, Key>(
  state: ResourceState<Data, Key>,
): ResourceState<Data, Key> | undefined {
  if (state.error) {
    return
  }

  return {
    effects: [],
    records: fromEntries(
      Object.entries(state.records).map(([path, pathRecords]) => [
        path,
        fromEntries(
          Object.entries(pathRecords).map(([hash, keyStates]) => [
            hash,
            keyStates.map(keyState => ({
              ...InitialKeyState,
              stale: keyState.invalidated,
              key: keyState.key,
              value: keyState.value,
            })),
          ]),
        ),
      ]),
    ),
    tasks: {
      nextId: 1,
      pausedBy: {},
      pending: {},
      queue: {},
    },
  }
}
