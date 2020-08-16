import { NextRouter } from 'next/router'
import {
  HistoryController,
  HistoryService,
  HistorySource,
  createHref,
  parseLocation,
} from 'retil-history'
import { observe } from 'retil-source'

export function createNextHistory(
  router: NextRouter,
  mapPathnameToRoute: (pathname: string) => string,
): HistoryService<any> {
  const source: HistorySource = observe((next, error) => {
    // TODO: should use routeChangeStart and output pendingRequest, then
    // remove pendingRequest on routeChangeComplete. But before this can
    // work, we need support in retil-router for consuming output of other
    // routers.

    next({
      pendingLocation: null,
      request: {
        ...parseLocation(router.asPath),
        key: undefined as any,
        method: 'GET',
      },
      trigger: 'POP',
    })

    const handleRouteChange = (url: string) => {
      next({
        pendingLocation: null,
        request: {
          ...parseLocation(url),
          // TODO: create a history-style unique key somehow
          key: undefined as any,
          // TODO: support non-GET methods
          method: 'GET',
        },
        trigger: 'POP',
      })
    }

    const handleRouteError = (err: any) => {
      if (!err.cancelled) {
        error(err)
      }
    }

    router.events.on('routeChangeStart', handleRouteChange)
    router.events.on('routeChangeError', handleRouteError)

    return () => {
      router.events.off('routeChangeStart', handleRouteChange)
      router.events.off('routeChangeError', handleRouteError)
    }
  })

  const controller: HistoryController = {
    back: () => {
      // TODO: this should keep track of whether the router was blocked.
      router.back()
      return Promise.resolve(true)
    },
    block: () => {
      // TODO: implement this with router.beforePopState
      // see: https://nextjs.org/docs/api-reference/next/router#routerbeforepopstate
      throw new Error('historyController.block is unimplemented')
    },
    navigate: (action, options = {}) => {
      const location = parseLocation(action)
      const route = mapPathnameToRoute(location.pathname)
      if (options.replace) {
        return router.replace(route, createHref(location))
      } else {
        return router.push(route, createHref(location))
      }
    },
  }

  return [source, controller]
}
