import { fromEntries } from '../../utils'

import { CacheReducerState } from '../types'

import { InitialPointerState } from './constants'

export function dehydrateResourceState(
  state: CacheReducerState,
): CacheReducerState | undefined {
  if (state.error) {
    return
  }

  return {
    data: fromEntries(
      Object.entries(state.data).map(([scope, types]) => [
        scope,
        fromEntries(
          Object.entries(types).map(([type, ids]) => [
            type,
            fromEntries(
              Object.entries(ids).map(([id, state]) => [
                id,
                {
                  ...InitialPointerState,
                  invalidated: state.invalidated,
                  pointer: state.pointer,
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
