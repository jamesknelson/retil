/**
 * Based on the "history" package
 * Copyright (c) React Training 2016-2018
 * Licensed under MIT license
 * https://github.com/ReactTraining/history/blob/28c89f4091ae9e1b0001341ea60c629674e83627/LICENSE
 *
 * With updates by James K Nelson
 * Copyright (c) Seven Stripes Kabushiki Kaisha 2021
 * Licensed under MIT license
 */

import {
  createState,
  createVector,
  fuse,
  getSnapshot,
  observe,
} from 'retil-source'
import { noop } from 'retil-support'

import {
  NavAction,
  NavBlockPredicate,
  NavController,
  NavEnv,
  NavLocation,
  NavReducer,
  NavService,
  NavTrigger,
} from './navTypes'
import { createHref, parseLocation, resolveAction } from './navUtils'

const defaultNavReducer: NavReducer = (location, action) =>
  resolveAction(action, location.pathname)

const noopResponse = {
  getHeaders: () => ({}),
  setHeader: noop,
  get statusCode() {
    return 200
  },
}

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
  env: NavEnv
  index: number
  version: number
}

export type BrowserNavServiceOptions = {
  basename?: string
  maxRedirectDepth?: number
  reducer?: NavReducer
  window?: Window
}

export function createBrowserNavService(
  options: BrowserNavServiceOptions = {},
): NavService {
  let readWriteCounter = 0

  const {
    basename = '',
    maxRedirectDepth = defaultMaxRedirectDepth,
    reducer = defaultNavReducer,
    window = document.defaultView!,
  } = options

  const blockPredicates = [] as NavBlockPredicate[]
  const history = window.history
  const [precacheSource, setPrecache] = createState<NavEnv[]>([])

  const cancelPrecacheQueue = [] as (() => void)[]

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

  const write = (env: NavEnv, options: { replace?: boolean } = {}) => {
    const index = readIndex() + Number(!options.replace)
    const historyState: HistoryState = {
      usr: env.state || undefined,
      key: env.navKey,
      idx: index,
    }
    const url = createHref(env)
    const method = options.replace ? 'replaceState' : 'pushState'

    // TODO: Support forced reloading
    // try...catch because iOS limits us to 100 pushState calls :/
    try {
      history[method](historyState, '', url)

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

  const cancelPrecacheLocation = (location: NavLocation) => {
    setPrecache((precache) => {
      const index = precache.findIndex(createLocationPredicate(location))
      if (index === -1) {
        return precache
      } else {
        const copy = precache.slice(0)
        precache.splice(index, 1)
        return copy
      }
    })
  }

  const getEnv = (
    location: NavLocation,
    options: { key?: string; redirectDepth?: number } = {},
  ): NavEnv => {
    const precachedEnv = getSnapshot(precacheSource).find(
      createLocationPredicate(location),
    )
    if (precachedEnv && (!options.key || options.key === precachedEnv.navKey)) {
      return precachedEnv
    }

    const { key = createKey(), redirectDepth = 0 } = options

    const redirect = (
      statusOrAction: number | string,
      action?: string,
    ): Promise<void> => {
      const to = resolveAction(
        action || (statusOrAction as string),
        location.pathname,
      )

      if (env !== getSnapshot(stateSource).env) {
        console.error(
          `A redirect was attempted from a location that is not currently active` +
            ` – from ${createHref(location)} to ${createHref(
              to,
            )}. This is often` +
            `due to precaching a link that points to a redirect.`,
        )
        cancelPrecacheLocation(env)
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
        const redirectEnv = getEnv(to, {
          redirectDepth: redirectDepth + 1,
        })

        write(redirectEnv, { replace: true })
      })
    }

    const env = {
      ...location,
      basename,
      navKey: key,
      params: {},
      redirect,
      response: noopResponse,
    }

    return env
  }

  const initialRead = read()
  const [stateSource, setState] = createState<NavState>({
    env: getEnv(initialRead.location, { key: initialRead.key }),
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

  const source = fuse((use, effect) => {
    const pop = use(popSource)
    const state = use(stateSource)
    const precache = use(precacheSource)

    const { env, version } = state

    if (pop.version > version) {
      return effect(() => {
        setState({
          version: pop.version,
          index: pop.index,
          env: getEnv(pop.location, { key: pop.key }),
        })
      })
    }

    // Remove precache items in an effect, so as to avoid unnecessary updates
    // just to
    if (cancelPrecacheQueue.length) {
      return effect(() => {
        while (cancelPrecacheQueue.length) {
          const cancel = cancelPrecacheQueue.pop()!
          cancel()
        }
      })
    }

    return createVector([
      env,
      ...precache.filter((precacheEnv) => precacheEnv !== env),
    ])
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
          write(getEnv(location), options)
        }
        return !blocked
      })
    },

    precache: (action) => {
      const location = resolve(action)
      const predicate = createLocationPredicate(location)
      const env = getEnv(location)

      // TODO:
      // - if a single location is has multiple `precache` calls holding
      //   it, then they should be reference counted instead of replaced.
      setPrecache((precache) => [
        ...precache.filter((env) => !predicate(env)),
        env,
      ])

      return () => {
        cancelPrecacheQueue.push(() => {
          setPrecache((precache) =>
            precache.filter((precacheEnv) => precacheEnv.navKey !== env.navKey),
          )
        })
      }
    },
  }

  return [source, controller]
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
  return (env: NavEnv) =>
    createHref(env) === href && env.state === location.state
}

interface HistoryState {
  idx?: number
  key?: string
  usr?: object
}
