import { NextRouter } from 'next/router'
import {
  HistoryController,
  HistoryRequest,
  HistoryService,
  HistorySource,
  createHref,
  parseLocation,
} from 'retil-history'
import { act, createState, observe } from 'retil-source'

import { getPageMatchers, mapPathnameToRoute } from './mapPathnameToRoute'
import { NextilState } from './nextilTypes'

let hasCachedPageList = false

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
    const [source] = createState<HistoryRequest & NextilState>({
      ...parseLocation(router.asPath),
      ...nextilState,
      key: undefined as any,
    })
    return [source, {} as any]
  }

  // Pre-cache the route list for faster navigation
  if (!hasCachedPageList && process.env.NODE_ENV === 'production') {
    getPageMatchers(router)
  }

  const source: HistorySource<NextilState, any> = observe(
    (next, error, _complete, clear) => {
      if (!router.events) {
        throw new Error(
          `Nextil error: trying to listen for router events on the server. Did you correctly pass initialSnapshot to your router?`,
        )
      }

      let lastSnapshot: HistoryRequest & NextilState = {
        ...parseLocation(router.asPath),
        ...nextilState,
        key: undefined as any,
      }

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
            // TODO: create a history-style unique key somehow, as this would
            // be helpful for remembering scroll position
            key: undefined as any,
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

  const controller: HistoryController = {
    back: () => {
      // TODO: this should keep track of whether the router was blocked.
      return Promise.resolve(true)
    },
    block: () => {
      // TODO: implement this with router.beforePopState
      // see: https://nextjs.org/docs/api-reference/next/router#routerbeforepopstate
      throw new Error('historyController.block is unimplemented')
    },
    plan: () => {
      throw new Error('historyController.plan is unimplemented')
    },
    navigate: (action, options = {}) =>
      act(source, async () => {
        const location = parseLocation(action)
        const route = await mapPathnameToRoute(router, location.pathname)
        if (options.replace) {
          return router.replace(route, createHref(location), { scroll: false })
        } else {
          return router.push(route, createHref(location), { scroll: false })
        }
      }),
  }

  return [source, controller]
}
