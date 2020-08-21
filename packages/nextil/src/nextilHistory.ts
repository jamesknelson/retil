import { NextRouter } from 'next/router'
import {
  HistoryController,
  HistoryRequest,
  HistoryService,
  HistorySource,
  createHref,
  parseLocation,
} from 'retil-history'
import { act, observe } from 'retil-source'

import { getPageMatchers, mapPathnameToRoute } from './mapPathnameToRoute'
import { NextilRequestExtension, NextilState } from './nextilTypes'

let hasCachedPageList = false

export function createNextHistory(
  router: NextRouter,
  nextilState: NextilState,
  latestNextilStateRef: { current?: NextilState },
): HistoryService<NextilRequestExtension, any> {
  // Pre-cache the route list for faster navigation
  if (
    !hasCachedPageList &&
    process.env.NODE_ENV === 'production' &&
    typeof window !== 'undefined'
  ) {
    getPageMatchers(router)
  }

  const source: HistorySource<NextilRequestExtension, any> = observe(
    (next, error, clear) => {
      let lastSnapshot: HistoryRequest & NextilRequestExtension = {
        ...parseLocation(router.asPath),
        ...nextilState,
        key: undefined as any,
        method: 'GET',
      }

      next(lastSnapshot)

      const handleRouteChangeComplete = async (url: string) => {
        if (
          nextilState.hasPageRouter &&
          latestNextilStateRef.current !== nextilState &&
          latestNextilStateRef.current!.hasPageRouter
        ) {
          const location = parseLocation(url)
          lastSnapshot = {
            request: {
              ...location,
              ...latestNextilStateRef.current!,
              // TODO: create a history-style unique key somehow
              key: undefined as any,
              method: 'GET',
            },
            trigger: 'POP',
          } as any

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
    navigate: (action, options = {}) =>
      act(source, async () => {
        const location = parseLocation(action)
        const route = await mapPathnameToRoute(router, location.pathname)
        if (options.replace) {
          return router.replace(route, createHref(location))
        } else {
          return router.push(route, createHref(location))
        }
      }),
  }

  return [source, controller]
}
