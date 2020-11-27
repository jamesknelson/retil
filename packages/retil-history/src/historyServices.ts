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
} from './historyTypes'
import { resolveAction, parseLocation } from './historyUtils'

const defaultLocationReducer: HistoryLocationReducer<any> = (
  location,
  action,
) => resolveAction(action, location.pathname)

export function createBrowserHistory<S extends HistoryState = HistoryState>(
  options: BrowserHistoryOptions,
): HistoryService<{}, S> {
  return createHistoryService(
    baseCreateBrowserHistory(options) as BrowserHistory<S>,
  )
}

export function createMemoryHistory<S extends HistoryState = HistoryState>(
  initialLocation: string | HistoryLocation<S>,
  initialMethod = 'GET',
): HistoryService<{}, S> {
  return createHistoryService(
    baseCreateMemoryHistory({
      initialEntries: [parseLocation(initialLocation)],
    }) as MemoryHistory<S>,
    initialMethod,
  )
}

export function createHistoryService<S extends HistoryState = HistoryState>(
  history: History<S>,
  initialMethod = 'GET',
  locationReducer: HistoryLocationReducer<S> = defaultLocationReducer,
): HistoryService<{}, S> {
  const actions = new Set<Promise<any>>()

  let forceChange = false
  let ignoreChange = false
  let lastRequest = {
    ...parseLocation(history.location),
    key: history.location.key,
    method: initialMethod,
  } as HistoryRequest<S>
  let nextMethod: string = 'GET'

  const source = observe<HistorySnapshot<{}, S>>((next) => {
    next(lastRequest)
    return history.listen(({ location }) => {
      if (!ignoreChange) {
        const method = nextMethod
        nextMethod = 'GET'
        lastRequest = {
          ...parseLocation(location),
          key: location.key,
          method,
        }
        next(lastRequest)
      }
    })
  })

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
        if (forceChange) {
          unblock()
          tx.retry()
        } else {
          const location = parseLocation(tx.location)
          act(source, () =>
            predicate(location, tx.action).then((shouldBlock) => {
              if (!shouldBlock) {
                unblock()
                tx.retry()
              }
            }),
          )
        }
      })
      return unblock
    },

    forceNavigate: (action, options): void => {
      forceChange = true
      controller.navigate(action, options)
      forceChange = false
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
          ignoreChange = true
          history.replace(location, location.state)
          ignoreChange = false
        }
        return navigated
      })
    },
  }

  return [source, controller]
}
