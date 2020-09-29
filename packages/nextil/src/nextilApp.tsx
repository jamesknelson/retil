import {
  AppContext,
  AppProps as NextAppProps,
  AppInitialProps as NextAppInitialProps,
} from 'next/app'
import * as React from 'react'
import { memo, useMemo } from 'react'
import { areShallowEqual } from 'retil-support'
import {
  RouterFunction,
  RouterState,
  RouterRequest,
  RouterResponse,
  UseRouterDefaultsContext,
  getInitialStateAndResponse,
} from 'retil-router'

import { createNextHistory } from './nextilHistory'
import { getNextilState } from './nextilState'
import {
  NextilAppOptions,
  NextilAppProps,
  NextilRequestExtension,
  NextilState,
} from './nextilTypes'

// getInitialProps completes before the router's routeChangeComplete event runs.
// As a result, on the client, we can use global state to pass the result of
// each page's getInitialProps, along with params and other info, to the router
// service.
let latestNextilStateRef = {} as {
  current?: NextilState
}

const BypassSerializationHack = Symbol()

interface UnserializedAppProps {
  // This will *only* be available on the server
  initialRouterState?: RouterState<NextilRequestExtension>
  // This will only be available *after* the initial render on the client
  nextilState?: NextilState
}

interface NextilAppInitialProps {
  // By passing an object with a symbol, we can bypass serialization and pass
  // in raw objects from getInitialProps -- while ensuring they're not
  // serialized on the server.
  bypassSerializationWrapper: {
    [BypassSerializationHack]: UnserializedAppProps
  }
}

export function nextilApp(
  App: React.ComponentType<any> & { getInitialProps?: Function },
  appOptions: NextilAppOptions = {},
) {
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

  const NextilApp = (props: NextAppProps & NextilAppInitialProps) => {
    const { bypassSerializationWrapper, ...restProps } = props
    const { Component, router: nextRouter, pageProps } = props
    const { initialRouterState, nextilState: nextilStateProp } =
      bypassSerializationWrapper[BypassSerializationHack] || {}

    // This is computed in gIP but again we can't pass it via props because it
    // can't be serialized. Pls stop serializing my goddamn props Next.
    const nextilState = useMemo(
      () =>
        nextilStateProp ||
        getNextilState({
          appOptions,
          pageDetails: {
            url: nextRouter.asPath,
            params: nextRouter.query,
            pageName: nextRouter.pathname,
            defaultExport: Component,
            getInitialPropsResult: pageProps,
          },
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [nextilStateProp],
    )

    const history = useMemo(
      () => createNextHistory(nextRouter, nextilState, latestNextilStateRef),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [nextRouter, nextilState.hasPageRouter || nextRouter.asPath],
    )

    const router = useMemo(() => {
      return nextilState.hasPageRouter
        ? (
            request: RouterRequest & NextilRequestExtension,
            response: RouterResponse,
          ) => request.router(request, response)
        : nextilState.router
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nextRouter, nextilState.hasPageRouter || nextRouter.asPath])

    const routerDefaults = useMemo(
      () => ({
        history,
        initialState: initialRouterState,
        transitionTimeoutMs: Infinity,
      }),
      [history, initialRouterState],
    )

    const nextilAppProps: NextilAppProps = {
      nextilRouter: router as RouterFunction,
    }

    return (
      <UseRouterDefaultsContext.Provider value={routerDefaults}>
        <MemoizedApp {...restProps} {...nextilAppProps} />
      </UseRouterDefaultsContext.Provider>
    )
  }

  NextilApp.getInitialProps = async (
    appContext: AppContext,
  ): Promise<(NextilAppInitialProps & NextAppInitialProps) | void> => {
    const { Component, ctx } = appContext

    let originalProps: any
    let pageProps: any
    if (originalGetInitialProps) {
      originalProps = await originalGetInitialProps()
      pageProps = originalProps.pageProps || {}
    } else {
      pageProps = Component.getInitialProps
        ? await Component.getInitialProps(ctx)
        : {}
    }

    const url = ctx.asPath!

    latestNextilStateRef.current = getNextilState({
      appOptions,
      pageDetails: {
        ctx,
        url,
        params: ctx.query,
        pageName: ctx.pathname,
        defaultExport: Component,
        getInitialPropsResult: pageProps,
      },
    })

    const unserializedProps: UnserializedAppProps = {
      nextilState: latestNextilStateRef.current,
    }

    const { basename, router } = latestNextilStateRef.current

    // Only get the full response before returning on the server
    if (ctx.req && ctx.res) {
      const [initialRouterState, response] = await getInitialStateAndResponse<
        NextilRequestExtension
      >(router, url, {
        basename,
        transformRequest: (request) =>
          Object.assign({}, request, latestNextilStateRef.current),
      })

      unserializedProps.initialRouterState = initialRouterState

      const { status = 200, headers } = response
      if (status >= 300 && status < 400) {
        ctx.res.writeHead(status, {
          ...headers,
          // Add the content-type for SEO considerations
          'Content-Type': 'text/html; charset=utf-8',
        })
        ctx.res.end()
        return
      }
      ctx.res.statusCode = status
    }

    return {
      ...originalProps,
      pageProps,
      bypassSerializationWrapper: {
        [BypassSerializationHack]: unserializedProps,
      },
    }
  }

  return NextilApp
}
