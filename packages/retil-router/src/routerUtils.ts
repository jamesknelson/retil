import { RouterController, RouterHistoryState } from './routerTypes'

// Wait for a list of promises that may have grown by the time the first
// promises resolves.
export async function waitForMutablePromiseList(promises: PromiseLike<any>[]) {
  let count = 0
  while (count < promises.length) {
    await promises[count++]
  }
  promises.length = 0
}

export function getNoopController<
  Ext = {},
  State extends RouterHistoryState = RouterHistoryState
>(): RouterController<Ext, State> {
  return {
    back: () => Promise.resolve(false),
    block: () => () => {},
    navigate: () => Promise.resolve(false),
    prefetch: () => Promise.reject(undefined),
  }
}
