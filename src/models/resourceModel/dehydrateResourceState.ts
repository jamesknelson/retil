import { InitialDocState } from './constants'
import { ResourceState } from './types'

import { fromEntries } from '../../utils'

export function dehydrateResourceState<Data, Rejection>(
  state: ResourceState<Data, Rejection>,
): ResourceState<Data, Rejection> | undefined {
  if (state.error) {
    return
  }

  return {
    scopes: fromEntries(
      Object.entries(state.scopes).map(([scope, types]) => [
        scope,
        fromEntries(
          Object.entries(types).map(([type, ids]) => [
            type,
            fromEntries(
              Object.entries(ids).map(([id, state]) => [
                id,
                {
                  ...InitialDocState,
                  invalidated: state.invalidated,
                  ref: state.ref,
                  value: state.value,
                },
              ]),
            ),
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
