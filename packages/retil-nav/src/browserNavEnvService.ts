/**
 * Some parts are based on the "history" package
 * Copyright (c) React Training 2016-2018
 * Licensed under MIT license
 * https://github.com/ReactTraining/history/blob/28c89f4091ae9e1b0001341ea60c629674e83627/LICENSE
 *
 * Modifications by James K Nelson
 * Copyright (c) Seven Stripes Kabushiki Kaisha 2021
 * Licensed under MIT license
 */
import deepEquals from 'fast-deep-equal'
import {
  createState,
  fuse,
  getSnapshot,
  observe,
  vectorFuse,
} from 'retil-source'
import { noop } from 'retil-support'

import {
  NavAction,
  NavBlockPredicate,
  NavController,
  NavSnapshot,
  NavLocation,
  NavReducer,
  NavEnvService,
  NavTrigger,
} from './navTypes'
import { createHref, parseLocation, resolveAction } from './navUtils'
import { NotFoundError } from './notFoundError'

const defaultNavReducer: NavReducer = (location, action) =>
  resolveAction(action, location.pathname)

const defaultMaxRedirectDepth = 10

const BeforeUnloadEventType = 'beforeunload'
const PopStateEventType = 'popstate'

interface NavRead {
  location: NavLocation
  index: number
  key: string
  version: number
}

interface NavState {
  env: NavSnapshot
  index: number
  version: number
}

interface CancelQueueItem {
  location: NavLocation
  cancel: () => void
}

export const getDefaultBrowserNavEnvService: {
  (window?: Window): NavEnvService
  value?: NavEnvService
  window?: Window
} = (
  window = typeof document === 'undefined'
    ? (undefined as unknown as Window)
    : document.defaultView!,
): NavEnvService => {
  if (
    !getDefaultBrowserNavEnvService.value ||
    getDefaultBrowserNavEnvService.window !== window
  ) {
    getDefaultBrowserNavEnvService.value = createBrowserNavEnvService({
      window,
    })
    getDefaultBrowserNavEnvService.window = window
  }
  return getDefaultBrowserNavEnvService.value
}

export const hasDefaultBrowserNavEnvService = () => {
  return !!getDefaultBrowserNavEnvService.window
}

export const setDefaultBrowserNavEnvService = (
  value: NavEnvService,
  window: Window = typeof document === 'undefined'
    ? (undefined as unknown as Window)
    : document.defaultView!,
) => {
  getDefaultBrowserNavEnvService.value = value
  getDefaultBrowserNavEnvService.window = window
}

export type BrowserNavEnvServiceOptions = {
  /**
   * Specifies the path at which this navigation service is mounted.
   *
   * E.g. if you're hosting an independent blog app under the "/blog" directory
   * of your domain, then this would be "/blog". Defaults to "".
   */
  basename?: string

  /**
   * Controls whether this nav service can be returned by
   * `getDefaultBrowserNavService`, and thus used by hooks like `useNavLink`.
   *
   * By default, the first nav created nav service will be used as the default
   * unless `getDefaultBrowserNavService` is called beforehand.
   *
   * Setting this to `true` will cause an error to be thrown if there's already
   * a default nav service.
   */
  default?: boolean

  /**
   * Sets the number of redirects that are allowed before retil-nav will
   * classify it as a redirect loop and bail with an error.
   */
  maxRedirectDepth?: number

  /**
   * Allows for customization of how actions map to new URLs.
   */
  reducer?: NavReducer

  /**
   * Sets the window object to use. When used in a browser, this will default
   * to the global window object.
   */
  window?: Window
}

export function createBrowserNavEnvService(
  options: BrowserNavEnvServiceOptions = {},
): NavEnvService {
  let readWriteCounter = 0

  const {
    basename = '',
    default: defaultNavService,
    maxRedirectDepth = defaultMaxRedirectDepth,
    reducer = defaultNavReducer,
    window = document.defaultView!,
  } = options

  const hasDefault = hasDefaultBrowserNavEnvService()
  if (hasDefault && defaultNavService) {
    throw new Error('Could not override the default nav service.')
  }

  const blockPredicates = [] as NavBlockPredicate[]
  const history = window.history
  const [precacheSource, setPrecache] = createState<NavSnapshot[]>([])
  const [precacheCancelQueueSource, setPrecacheCancelQueue] = createState<
    CancelQueueItem[]
  >([])

  const isBlocked = (
    location: NavLocation,
    trigger: NavTrigger,
  ): Promise<boolean> => {
    const checkedPredicates = blockPredicates.slice(0)
    return Promise.all(
      checkedPredicates.map((predicate) => predicate(location, trigger)),
    ).then((blocks) =>
      blocks.some(
        (block, i) =>
          block &&
          // Ensure the block hasn't been removed in the meantime
          blockPredicates.indexOf(checkedPredicates[i]) !== -1,
      ),
    )
  }

  const readIndex = () => (history.state || {}).idx

  const read = (): NavRead => {
    const state = window.history.state || ({} as HistoryState)
    const key = state.key || 'default'
    return {
      index: state.idx,
      key,
      location: parseLocation(window.location, state.usr),
      version: ++readWriteCounter,
    }
  }

  const runBeforeEnvChange = [] as (() => void)[]
  const precacheUntilEnvChange = (action: NavAction) => {
    runBeforeEnvChange.push(controller.precache(action))
  }

  const write = (env: NavSnapshot, options: { replace?: boolean } = {}) => {
    const index = readIndex() + Number(!options.replace)
    const historyState: HistoryState = {
      usr: env.state || undefined,
      key: env.key,
      idx: index,
    }
    const url = createHref(env)
    const method = options.replace ? 'replaceState' : 'pushState'

    // TODO: Support forced reloading
    // try...catch because iOS limits us to 100 pushState calls :/
    try {
      history[method](historyState, '', url)

      const callbacks = runBeforeEnvChange.slice()
      runBeforeEnvChange.length = 0
      for (const callback of callbacks) {
        callback()
      }
      setState({
        env,
        index,
        version: ++readWriteCounter,
      })
    } catch (error) {
      // They are going to lose state here, but there is no real
      // way to warn them about it since the page will refresh...
      window.location.assign(url)
    }
  }

  if (typeof readIndex() !== 'number') {
    history.replaceState({ ...history.state, idx: 0 }, '')
  }

  const getNavSnapshot = (
    location: NavLocation,
    options: {
      key?: string
      precacheContext?: {
        notFound: () => void
        redirect: (
          statusOrAction: number | string,
          action?: string,
        ) => Promise<void>
        precache: () => void
      }
      redirectDepth?: number
    } = {},
  ): NavSnapshot => {
    const precachedEnv = getSnapshot(precacheSource).find(
      createLocationPredicate(location),
    )
    if (precachedEnv && (!options.key || options.key === precachedEnv.key)) {
      return precachedEnv
    }

    const { key = createKey(), precacheContext, redirectDepth = 0 } = options

    const notFound =
      precacheContext?.notFound ??
      (() => {
        throw new NotFoundError(nav)
      })
    const redirect =
      precacheContext?.redirect ??
      ((statusOrAction: number | string, action?: string): Promise<void> => {
        const to = resolveAction(
          action || (statusOrAction as string),
          location.pathname,
        )

        if (nav !== getSnapshot(stateSource).env) {
          console.error(
            `A redirect was attempted from a location that is not currently active` +
              ` – from ${createHref(location)} to ${createHref(to)}.`,
          )
          return Promise.resolve()
        }

        if ((options.redirectDepth || 0) > maxRedirectDepth) {
          throw new Error('Possible redirect loop detected')
        }

        // Navigate in a microtask so that we don't cause any synchronous updates to
        // components listening to the history.
        return Promise.resolve().then(() => {
          // There's no need to precache redirects or keep keys. We'll also force
          // redirects even if there are blockers in play.
          const redirectEnv = getNavSnapshot(to, {
            redirectDepth: redirectDepth + 1,
          })

          write(redirectEnv, { replace: true })
        })
      })

    const nav: NavSnapshot = {
      ...location,
      basename,
      key,
      matchname: basename,
      notFound,
      params: {},
      precache: precacheUntilEnvChange,
      redirect,
    }

    return nav
  }

  const initialRead = read()
  const [stateSource, setState] = createState<NavState>({
    env: getNavSnapshot(initialRead.location, { key: initialRead.key }),
    index: initialRead.index,
    version: initialRead.version,
  })

  let blockedPop: {
    allowed?: boolean
    blockedPromise: Promise<boolean>
    delta: number
    location: NavLocation
  } | null = null
  const popSource = observe<NavRead>((next) => {
    next(read())

    const handlePopState = () => {
      const popped = read()
      const { index } = getSnapshot(stateSource)
      const delta = index - popped.index
      const allowed =
        (blockedPop && blockedPop.delta === delta && blockedPop.allowed) ||
        !blockPredicates.length

      if (allowed) {
        next(popped)
      } else if (popped.index !== null) {
        if (delta) {
          // Revert the POP, then retry it if the blockers come back
          blockedPop = {
            blockedPromise: isBlocked(popped.location, 'POP'),
            delta,
            location: popped.location,
          }

          // This will cause another pop to be run, which will now have
          // a value for blockedTransition
          history.go(delta)
        } else if (blockedPop) {
          // We've reverted to our current index after blocking.
          const pop = blockedPop
          blockedPop.blockedPromise.then((blocked) => {
            if (pop === blockedPop) {
              if (blocked) {
                blockedPop = null
              } else {
                blockedPop.allowed = true
                history.go(blockedPop.delta * -1)
              }
            }
          })
        }
      } else {
        // Trying to POP to a location with no index. We did not create
        // this location, so we can't effectively block the navigation.
      }
    }

    window.addEventListener(PopStateEventType, handlePopState)
    return () => {
      window.removeEventListener(PopStateEventType, handlePopState)
    }
  })

  const createResult = (env: NavSnapshot, ...precaches: NavSnapshot[]) => {
    // Remove precache items in an effect, so as to avoid unnecessary
    // updates just to remove precached items.
    return [env, ...precaches.filter((precacheEnv) => precacheEnv !== env)]
  }

  const [resultStashSource, setResultStash] = createState<NavSnapshot[]>()
  const navSource = vectorFuse((use, act, memo) => {
    const [pop] = use(popSource)
    const [state] = use(stateSource)

    // TODO: Use an LRU cache to prevent things from getting too large.
    const [precache] = use(precacheSource)
    const [precacheCancelQueue] = use(precacheCancelQueueSource)

    const { env, version } = state

    if (pop.version > version) {
      return act(() => {
        const callbacks = runBeforeEnvChange.slice()
        runBeforeEnvChange.length = 0
        for (const callback of callbacks) {
          callback()
        }
        setState({
          version: pop.version,
          index: pop.index,
          env: getNavSnapshot(pop.location, { key: pop.key }),
        })
      })
    }

    const result = memo(createResult, [env, ...precache])

    // Cancel precache items only when env changes
    const [resultStash] = use(resultStashSource)
    if (resultStash !== result) {
      return act(() => {
        if (precacheCancelQueue.length) {
          while (precacheCancelQueue.length) {
            const { cancel } = precacheCancelQueue.pop()!
            cancel()
          }
          setPrecacheCancelQueue([])
        }
        setResultStash(result)
      })
    }

    return result
  })

  const resolve = (action: NavAction): NavLocation => {
    // Read in case the source isn't mounted
    const location = read().location
    return reducer(location, action)
  }

  const controller: NavController = {
    back: () => history.back(),

    block: (predicate) => {
      blockPredicates.push(predicate)

      if (blockPredicates.length === 1) {
        window.addEventListener(BeforeUnloadEventType, promptBeforeUnload)
      }

      const unblock = () => {
        const index = blockPredicates.indexOf(predicate)
        if (index !== -1) {
          blockPredicates.splice(index, 1)
        }

        // Remove the beforeunload listener so the document may
        // still be salvageable in the pagehide event.
        // See https://html.spec.whatwg.org/#unloading-documents
        if (!blockPredicates.length) {
          window.removeEventListener(BeforeUnloadEventType, promptBeforeUnload)
        }
      }

      return unblock
    },

    go: (count: number) => history.go(count),

    navigate: (action, options = {}): Promise<boolean> => {
      const location = resolve(action)
      const trigger: NavTrigger = options.replace ? 'REPLACE' : 'PUSH'
      return isBlocked(location, trigger).then((blocked) => {
        if (!blocked) {
          write(getNavSnapshot(location), options)
        }
        return !blocked
      })
    },

    precache: (action) => {
      const location = resolve(action)
      const predicate = createLocationPredicate(location)
      const cancelPrecacheQueue = getSnapshot(precacheCancelQueueSource)
      const cancelQueueIndex = cancelPrecacheQueue.findIndex((item) =>
        predicate(item.location),
      )
      let cancelQueueItem: CancelQueueItem
      if (cancelQueueIndex !== -1) {
        // If this action has already been precached, and is queued to be
        // removed from the precache, then just cancel the removal mutatively.
        cancelQueueItem = cancelPrecacheQueue[cancelQueueIndex]
        cancelPrecacheQueue.splice(cancelQueueIndex, 1)
      } else {
        let released = false
        const releasePrecacheImmediately = () => {
          if (!released) {
            released = true
            setPrecache((precache) =>
              precache.filter((precacheEnv) => precacheEnv.key !== nav.key),
            )
          }
          return Promise.resolve()
        }

        const nav = getNavSnapshot(location, {
          precacheContext: {
            notFound: releasePrecacheImmediately,
            redirect: releasePrecacheImmediately,
            precache: noop,
          },
        })

        // TODO:
        // - if a single location is has multiple `precache` calls holding
        //   it, then they should be reference counted instead of replaced.
        // - TODO: turn this into an LRU cache, as we want a maximum to the
        //   number of precacheable things.
        setPrecache((precache) => [
          ...precache.filter((nav) => !predicate(nav)),
          nav,
        ])

        cancelQueueItem = {
          location,
          cancel: releasePrecacheImmediately,
        }
      }

      const scheduleRelease = () => {
        setPrecacheCancelQueue((cancels) => [...cancels, cancelQueueItem])
      }
      return scheduleRelease
    },
  }

  const navEnvSource = fuse((use) => ({ nav: use(navSource) }))
  const service = [navEnvSource, controller] as const

  if (!hasDefault && (defaultNavService || defaultNavService === undefined)) {
    setDefaultBrowserNavEnvService(service, window)
  }

  return service
}

function promptBeforeUnload(event: BeforeUnloadEvent) {
  // Cancel the event.
  event.preventDefault()
  // Chrome (and legacy IE) requires returnValue to be set.
  event.returnValue = ''
}

function createKey() {
  return Math.random().toString(36).substr(2, 8)
}

function createLocationPredicate(location: NavLocation) {
  const href = createHref(location)
  return (navLocation: NavLocation) =>
    createHref(navLocation) === href &&
    deepEquals(navLocation.state, location.state)
}

interface HistoryState {
  idx?: number
  key?: string
  usr?: object
}
