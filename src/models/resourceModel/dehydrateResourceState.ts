import { InitialDocState } from './constants'
import { ResourceState } from './types'

import { fromEntries } from '../../utils'

export function dehydrateResourceState<Data, Rejection, Id>(
  state: ResourceState<Data, Rejection, Id>,
): ResourceState<Data, Rejection, Id> | undefined {
  if (state.error) {
    return
  }

  return {
    effects: [],
    scopes: fromEntries(
      Object.entries(state.scopes).map(([path, pathRecords]) => [
        path,
        fromEntries(
          Object.entries(pathRecords).map(([id, docState]) => [
            id,
            {
              ...InitialDocState,
              invalidated: docState.invalidated,
              id: docState.id,
              value: docState.value,
            },
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
