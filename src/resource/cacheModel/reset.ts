import { fromEntries } from '../../utils'

import { CacheReducerState } from '../types'

export function reset(state?: CacheReducerState): CacheReducerState {
  const { pending, nextId } = state ? state.tasks : { pending: {}, nextId: 1 }

  return {
    data: {},
    tasks: {
      nextId,
      pending: {},
      pausedBy: {},
      queue: fromEntries(Object.keys(pending).map(key => [key, 'stop'])),
    },
  }
}
