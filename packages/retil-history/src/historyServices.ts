import {
  BrowserHistory,
  BrowserHistoryOptions,
  History,
  MemoryHistory,
  createBrowserHistory as baseCreateBrowserHistory,
  createMemoryHistory as baseCreateMemoryHistory,
} from 'history'
import { act, observe } from 'retil-source'

import {
  HistoryController,
  HistoryLocation,
  HistoryLocationReducer,
  HistoryService,
  HistorySnapshot,
  HistoryState,
  HistoryRequest,
  HistoryRequestPrecache,
} from './historyTypes'
import { createActionMap, parseLocation, resolveAction } from './historyUtils'

const defaultLocationReducer: HistoryLocationReducer<any> = (
  location,
  action,
) => resolveAction(action, location.pathname)

export function createBrowserHistory<S extends HistoryState = HistoryState>(
  options?: BrowserHistoryOptions,
): HistoryService<{}, S> {
  return createHistoryService(
    baseCreateBrowserHistory(options) as BrowserHistory<S | null>,
  )
}

export function createMemoryHistory<S extends HistoryState = HistoryState>(
  initialLocation: string | HistoryLocation<S>,
): HistoryService<{}, S> {
  return createHistoryService(
    baseCreateMemoryHistory({
      initialEntries: [parseLocation(initialLocation)],
    }) as MemoryHistory<S | null>,
  )
}

export function createHistoryService<S extends HistoryState = HistoryState>(
  history: History<S | null>,
  locationReducer: HistoryLocationReducer<S> = defaultLocationReducer,
): HistoryService<{}, S> {
  let forceChange = false
  let lastRequest = {
    ...parseLocation(history.location),
    key: history.location.key,
  } as HistoryRequest<S>

  const precachedRequests = createActionMap<HistoryRequestPrecache<S>>()

  const source = observe<HistorySnapshot<{}, S>>((next) => {
    next(lastRequest)
    return history.listen(({ location }) => {
      const parsedLocation = parseLocation(location)
      const precachedRequest = precachedRequests.get(parsedLocation)
      lastRequest = {
        ...(precachedRequest || parsedLocation),
        key: location.key,
      }
      precachedRequests.clear()
      next(lastRequest)
    })
  })

  const runMaybeBlockedAction = (callback: () => any): Promise<boolean> => {
    const key = history.location.key
    return new Promise<boolean>((resolve) =>
      act(source, callback).finally(() => {
        resolve(history.location.key !== key)
      }),
    )
  }

  const controller: HistoryController<{}, S> = {
    back: (): Promise<boolean> =>
      runMaybeBlockedAction(() => {
        history.back()
      }),

    block: (predicate) => {
      const unblock = history.block((tx) => {
        if (forceChange) {
          unblock()
          tx.retry()
        } else {
          const location = parseLocation(tx.location)
          act(source, () => {
            return predicate(location, tx.action).then((shouldBlock) => {
              if (!shouldBlock) {
                unblock()
                tx.retry()
              }
            })
          })
        }
      })
      return unblock
    },

    navigate: (action, options): Promise<boolean> => {
      const { replace = false } = options || {}
      let location: HistoryLocation<S>
      return runMaybeBlockedAction(() => {
        location = locationReducer(lastRequest, action)
        forceChange = !!options?.force
        try {
          history[replace ? 'replace' : 'push'](location, location.state)
        } finally {
          forceChange = false
        }
      })
    },

    precache: (action): Promise<HistoryRequestPrecache<S>> => {
      const location = locationReducer(lastRequest, action)

      let precachedRequest = precachedRequests.get(location)
      if (!precachedRequest) {
        precachedRequest = {
          ...location,
          precacheId: Symbol(),
        }
        delete precachedRequest.key
        precachedRequests.set(location, precachedRequest)
      }

      return Promise.resolve(precachedRequest)
    },
  }

  return [source, controller]
}
