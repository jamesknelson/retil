import {
  RouterController,
  RouterHistoryState,
  RouterResponse,
} from './routerTypes'

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
  State extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
>(): RouterController<Ext, State, Response> {
  return {
    back: () => Promise.resolve(false),
    block: () => () => {},
    navigate: () => Promise.resolve(false),
    prefetch: () => Promise.reject(undefined),
  }
}
