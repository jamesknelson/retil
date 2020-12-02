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
  HistoryRequestPlan,
} from './historyTypes'
import { createActionMap, parseLocation, resolveAction } from './historyUtils'

const defaultLocationReducer: HistoryLocationReducer<any> = (
  location,
  action,
) => resolveAction(action, location.pathname)

export function createBrowserHistory<S extends HistoryState = HistoryState>(
  options: BrowserHistoryOptions,
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

  const plannedRequests = createActionMap<HistoryRequestPlan<S>>()

  const source = observe<HistorySnapshot<{}, S>>((next) => {
    next(lastRequest)
    return history.listen(({ location }) => {
      const parsedLocation = parseLocation(location)
      const plannedRequest = plannedRequests.get(parsedLocation)
      lastRequest = {
        ...(plannedRequest || parsedLocation),
        key: location.key,
      }
      plannedRequests.clear()
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

    plan: (action): Promise<HistoryRequestPlan<S>> => {
      const location = locationReducer(lastRequest, action)

      let plannedRequest = plannedRequests.get(location)
      if (!plannedRequest) {
        plannedRequest = {
          ...location,
          planId: Symbol(),
        }
        delete plannedRequest.key
        plannedRequests.set(location, plannedRequest)
      }

      return Promise.resolve(plannedRequest)
    },
  }

  return [source, controller]
}
