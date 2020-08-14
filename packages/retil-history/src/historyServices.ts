import {
  BrowserHistory,
  BrowserHistoryOptions,
  History,
  MemoryHistory,
  createBrowserHistory as baseCreateBrowserHistory,
  createMemoryHistory as baseCreateMemoryHistory,
} from 'history'
import { act, mergeLatest, observe } from 'retil-source'

import {
  HistoryAction,
  HistoryController,
  HistoryLocation,
  HistoryService,
  HistorySnapshot,
  HistoryState,
  HistoryRequest,
} from './history'
import { applyLocationAction, parseLocation } from './utils'

export type HistoryLocationReducer<S extends HistoryState = HistoryState> =
  // This returns a partial request, as a key and cache still need to be added
  // by the router itself.
  (location: HistoryLocation<S>, action: HistoryAction<S>) => HistoryLocation<S>

export function createBrowserHistory<S extends HistoryState = HistoryState>(
  options: BrowserHistoryOptions,
): HistoryService<S> {
  return createHistoryService(
    baseCreateBrowserHistory(options) as BrowserHistory<S>,
  )
}

export function createMemoryHistory<S extends HistoryState = HistoryState>(
  initialURL: string,
): HistoryService<S> {
  return createHistoryService(
    baseCreateMemoryHistory({ initialEntries: [initialURL] }) as MemoryHistory<
      S
    >,
  )
}

export function createHistoryService<S extends HistoryState = HistoryState>(
  history: History<S>,
  locationReducer: HistoryLocationReducer<S> = applyLocationAction,
): HistoryService<S> {
  const actions = new Set<Promise<any>>()

  let pendingLocation: null | HistoryLocation<S> = null
  let lastRequest = {
    ...parseLocation(history.location),
    key: history.location.key,
    method: 'GET',
  } as HistoryRequest<S>
  let nextMethod: string = 'GET'

  const source = observe<Omit<HistorySnapshot<S>, 'pendingLocation'>>(
    (next) => {
      next({ trigger: 'POP', request: lastRequest })
      return history.listen(({ action, location }) => {
        const method = nextMethod
        nextMethod = 'GET'
        lastRequest = {
          ...parseLocation(location),
          key: location.key,
          method,
        }
        next({
          trigger: action,
          request: lastRequest,
        })
      })
    },
  )

  const runMaybeBlockedAction = (callback: () => any): Promise<boolean> => {
    let action: Promise<boolean> | undefined
    const key = history.location.key
    const runAction = () =>
      new Promise<boolean>((resolve) =>
        act(source, () => {
          // If blocked, another action will synchronously be called during
          // history.back, delaying the result until the block completes.
          callback()
        }).then(() => {
          if (action) {
            actions.delete(action)
          }
          resolve(history.location.key !== key)
        }),
      )
    if (actions.size) {
      const action = Promise.all(actions.values()).then(runAction)
      actions.add(action)
      return action
    } else {
      return runAction()
    }
  }

  const controller: HistoryController<S> = {
    back: (): Promise<boolean> =>
      runMaybeBlockedAction(() => {
        history.back()
      }),

    block: (predicate) => {
      const unblock = history.block((tx) => {
        const location = parseLocation(tx.location)
        pendingLocation = location
        act(source, () =>
          predicate(location, tx.action).then((shouldBlock) => {
            pendingLocation = null
            if (!shouldBlock) {
              unblock()
              tx.retry()
            }
          }),
        )
      })
      return unblock
    },

    navigate: (action, options): Promise<boolean> => {
      const { method = 'GET', replace = false } = options || {}
      let location: HistoryLocation<S>
      return runMaybeBlockedAction(() => {
        nextMethod = method
        location = locationReducer(lastRequest, action)
        history[replace ? 'replace' : 'push'](location, location.state)
      }).then((navigated) => {
        // If not a GET method, immediate replace the state with the same
        // same so that the key will change, so the "back" button will
        // in a request with a different key (as the method will be
        // changed to GET)
        if (navigated && method !== 'GET') {
          history.replace(location, location.state)
        }
        return navigated
      })
    },
  }

  const sourceWithBlocking = mergeLatest(
    source,
    (latestSnapshot, isActing) => ({
      ...latestSnapshot,
      pendingLocation: isActing ? pendingLocation : null,
    }),
  )

  return [sourceWithBlocking, controller]
}
