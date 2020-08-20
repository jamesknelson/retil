import { NextRouter } from 'next/router'
import {
  HistoryController,
  HistoryService,
  HistorySource,
  createHref,
  parseLocation,
} from 'retil-history'
import { act, mergeLatest, observe } from 'retil-source'
import { RouterFunction, RouterSnapshot } from 'retil-router'

import { getPageMatchers, mapPathnameToRoute } from './mapPathnameToRoute'
import { NextilState } from './nextilTypes'

let hasCachedPageList = false

export function createNextHistory(
  router: NextRouter,
  nextilState: NextilState,
  latestNextilStateRef: { current?: NextilState },
): HistoryService<any> {
  // Pre-cache the route list for faster navigation
  if (
    !hasCachedPageList &&
    process.env.NODE_ENV === 'production' &&
    typeof window !== 'undefined'
  ) {
    getPageMatchers(router)
  }

  const source: HistorySource = observe((next, error) => {
    let lastSnapshot: RouterSnapshot<{ router: RouterFunction<any, any> }> = {
      request: {
        ...parseLocation(router.asPath),
        ...nextilState,
        key: undefined as any,
        method: 'GET',
      },
      trigger: 'POP',
    } as any

    next(lastSnapshot as any)

    const handleRouteChangeStart = (url: string) => {
      next({
        ...lastSnapshot,
        pendingRequestCreation: parseLocation(url),
      } as any)
    }

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

        next(lastSnapshot as any)
      } else {
        next({
          ...lastSnapshot,
          pendingRequestCreation: null,
        } as any)
      }
    }

    const handleRouteError = (err: any, _url: string) => {
      // TODO: turn off pending state if necessary
      if (!err.cancelled) {
        error(err)
      }
    }

    router.events.on('routeChangeStart', handleRouteChangeStart)
    router.events.on('routeChangeError', handleRouteError)
    router.events.on('routeChangeComplete', handleRouteChangeComplete)

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart)
      router.events.off('routeChangeError', handleRouteError)
      router.events.off('routeChangeComplete', handleRouteChangeComplete)
    }
  })

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

  const sourceWithBlocking = mergeLatest(source, (latestSnapshot) => ({
    ...latestSnapshot,
  }))

  return [sourceWithBlocking, controller]
}
