import { NextRouter } from 'next/router'
import {
  HistoryController,
  HistorySnapshot,
  HistoryService,
  HistorySource,
  createHref,
  parseLocation,
} from 'retil-history'
import { createState, observe } from 'retil-source'

import { getPageMatchers, mapPathnameToRoute } from './mapPathnameToRoute'
import { NextilState } from './nextilTypes'

function createRequestKey() {
  return Math.random().toString(36).substr(2, 8)
}

// getInitialProps completes before the router's routeChangeComplete event runs.
// As a result, on the client, we can use global state to pass the result of
// each page's getInitialProps, along with params and other info, to the router
// service.
export let latestNextilStateRef = {} as {
  current?: NextilState
}

export function createNextHistory(
  router: NextRouter,
  nextilState: NextilState,
): HistoryService<NextilState, any> {
  // If we're on the server, return a constant source
  if (!router.events) {
    const [source] = createState<HistorySnapshot & NextilState>({
      ...parseLocation(router.asPath),
      ...nextilState,
      historyKey: undefined as any,
    })
    return [source, {} as any]
  }

  // Pre-cache the route list for faster navigation
  if (getPageMatchers.cache && process.env.NODE_ENV === 'production') {
    getPageMatchers(router)
  }

  const source: HistorySource<NextilState, any> = observe(
    (next, error, _complete, clear) => {
      if (!router.events) {
        throw new Error(
          `Nextil error: trying to listen for router events on the server. Did you correctly pass initialSnapshot to your router?`,
        )
      }

      let lastSnapshot: HistorySnapshot & NextilState = {
        historyKey: 'default',
        ...parseLocation(router.asPath),
        ...nextilState,
      }

      window.history.replaceState(
        {
          ...window.history.state,
          options: {
            // Set the default key
            retilKey: 'default',
            ...window.history.state.options,
            // Disable auto-scroll when navigating back to the initial route
            scroll: false,
          },
        },
        '',
      )

      next(lastSnapshot)

      const handleRouteChangeComplete = async (url: string) => {
        if (
          nextilState.isRoutedPage &&
          latestNextilStateRef.current !== nextilState &&
          latestNextilStateRef.current!.isRoutedPage
        ) {
          const location = parseLocation(url)
          lastSnapshot = {
            ...location,
            ...latestNextilStateRef.current!,

            historyKey: window.history.state.options.retilKey,
          }

          next(lastSnapshot)
        } else {
          next(lastSnapshot)
        }
      }

      const handleRouteError = (err: any, _url: string) => {
        if (!err.cancelled) {
          error(err)
        } else {
          next(lastSnapshot)
        }
      }

      // TODO: instead of clearing history, push a request with no "router".
      // Then in the wrapper router in nextilApp, if "router" is missing, add a
      // promise to pendingSuspenses that resolves after the full route is
      // rendered.
      router.events.on('routeChangeStart', clear)
      router.events.on('routeChangeError', handleRouteError)
      router.events.on('routeChangeComplete', handleRouteChangeComplete)

      return () => {
        router.events.off('routeChangeStart', clear)
        router.events.off('routeChangeError', handleRouteError)
        router.events.off('routeChangeComplete', handleRouteChangeComplete)
      }
    },
  )

  // There's no way to remove the popState handler, but adding one removes
  // the previous one.
  router.beforePopState(() => {
    // TODO: implement blocking
    return true
  })

  const controller: HistoryController = {
    back: () => {
      // TODO: this should keep track of whether the router was blocked.
      return Promise.resolve(true)
    },
    block: (_predicate) => {
      // TODO: implement this with router.beforePopState
      // see: https://nextjs.org/docs/api-reference/next/router#routerbeforepopstate
      //
      // 1. block all transitions
      // 2. call the shouldBlock predicate
      // 3. await the shouldBlock response
      // 4. if false, retry
      throw new Error('historyController.block is unimplemented')
    },
    precache: () => {
      throw new Error('historyController.plan is unimplemented')
    },

    // NOTE: even though this is asynchronous, we don't wrap it in "act()" as
    // we still want the history to have a value during navigation -- otherwise
    // we don't have enough information to decide whether to display a loading
    // bar or not.
    navigate: async (action, options = {}) => {
      const location = parseLocation(action)
      const route = await mapPathnameToRoute(router, location.pathname)

      // Next.js just feeds these directly into window.history.state,
      // allowing us
      const nextOptions = {
        retilKey: createRequestKey(),
        scroll: false,
      } as any

      if (options.replace) {
        return router.replace(route, createHref(location), nextOptions)
      } else {
        return router.push(route, createHref(location), nextOptions)
      }
    },
  }

  return [source, controller]
}
