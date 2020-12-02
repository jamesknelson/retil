import { AppProps as NextAppProps } from 'next/app'
import * as React from 'react'
import { memo, useMemo } from 'react'
import {
  RouterFunction,
  createRequestService,
  parseLocation,
  routeNotFoundBoundary,
} from 'retil-router'
import { FusorUse } from 'retil-source'
import { areShallowEqual } from 'retil-support'

import { BypassSerializationHack } from './nextilConstants'
import { createNextHistory, latestNextilStateRef } from './nextilHistory'
import { NextilRouterDefaultsContext } from './nextilRouter'
import { notFoundRouterRef } from './nextilNotFound'
import { NextilRequest, NextilResponse, NextilState } from './nextilTypes'

export interface NextilAppProps {
  routerFunction: RouterFunction<NextilRequest>
}

export interface NextilAppOptions {
  extendRequest?: (request: NextilRequest, use: FusorUse) => any
  notFoundRouter?: RouterFunction<NextilRequest, NextilResponse>
}

export function nextilApp(
  App: React.ComponentType<any> & { getInitialProps?: Function },
  { extendRequest, notFoundRouter }: NextilAppOptions = {},
) {
  // Store this in global state so that nextilRoutedPage can find it.
  if (notFoundRouter) {
    notFoundRouterRef.current = notFoundRouter
  }

  const originalGetInitialProps = App.getInitialProps
  const MemoizedApp = memo(
    App,
    (
      { pageProps: prevPageProps, ...prevProps },
      { pageProps: nextPageProps, ...nextProps },
    ) =>
      areShallowEqual(prevPageProps, nextPageProps) &&
      areShallowEqual(prevProps, nextProps),
  )

  const NextilApp = (props: NextAppProps) => {
    const {
      Component,
      router: nextRouter,
      pageProps: { bypassSerializationWrapper = {}, ...pageProps },
      ...restProps
    } = props
    const meomizedAppProps = {
      Component,
      router: nextRouter,
      pageProps,
      ...restProps,
    }
    const { initialSnapshot, nextilState: nextilStateProp } =
      bypassSerializationWrapper[BypassSerializationHack] || {}

    const getNextilState:
      | undefined
      | ((
          pageName: string,
          params: object,
          pageProps: any,
        ) => NextilState) = (Component as any).getNextilState
    const isRoutedPage = !!getNextilState

    // On the initial render on the client, gIP won't be run, so we'll need
    // to compute this within the component.
    if (getNextilState) {
      if (!nextilStateProp && !latestNextilStateRef.current) {
        latestNextilStateRef.current = getNextilState(
          nextRouter.pathname,
          nextRouter.query,
          props.pageProps,
        )
      }
    } else {
      latestNextilStateRef.current = {
        basename: parseLocation(nextRouter.asPath).pathname,
        isRoutedPage: false,
        isSSR: typeof window === 'undefined',
        params: nextRouter.query,
        router: () => <Component {...pageProps} />,
      }
    }

    // Only re-use the request service when switching between retil routes.
    // Create a new request service for each new Next.js page.
    const requestService = useMemo(
      () =>
        createRequestService<any, NextilRequest>({
          extend: (request, use) => {
            if (request.extendRequest) {
              request = { ...request, ...request.extendRequest(request, use) }
            }
            // Apply the app extendRequest *after* the page one
            if (extendRequest) {
              request = { ...request, ...extendRequest(request, use) }
            }
            return request
          },
          historyService: createNextHistory(
            nextRouter,
            nextilStateProp || latestNextilStateRef.current!,
          ) as any,
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [nextRouter, isRoutedPage || nextRouter.asPath],
    )

    const routerFunction = useMemo(() => {
      return (request: NextilRequest, response: NextilResponse) => {
        // nextilRoutedPage handles the not found boundary itself when doing
        // server rendering
        const router = request.serverRequest
          ? request.router
          : routeNotFoundBoundary(request.router, notFoundRouterRef.current)
        return router(request, response)
      }
    }, [])

    const routerDefaults = useMemo(
      () => ({
        routerFunction,
        requestService,
        initialSnapshot,
      }),
      [routerFunction, requestService, initialSnapshot],
    )

    const nextilAppProps: NextilAppProps = {
      routerFunction,
    }

    return (
      <NextilRouterDefaultsContext.Provider value={routerDefaults}>
        <MemoizedApp {...meomizedAppProps} {...nextilAppProps} />
      </NextilRouterDefaultsContext.Provider>
    )
  }

  NextilApp.getInitialProps = originalGetInitialProps

  return NextilApp
}
