import { NextComponentType, NextPageContext } from 'next'
import { AppContext, AppProps } from 'next/app'
import { NextRouter } from 'next/router'
import * as React from 'react'
import { useMemo } from 'react'
import {
  RouterState,
  RouterRequest,
  RouterResponse,
  RouterProvider,
  getInitialStateAndResponse,
  routeNotFoundBoundary,
  useRouter,
} from 'retil-router'

import { createNextHistory } from './createNextHistory'

interface RetilAppProps extends AppProps {
  initialRouterState?: RouterState
  Component: NextComponentType<NextPageContext, {}, any> & {
    Layout?: React.ComponentType<any>
  }
}

function getRouterAndBasename(
  Component: any,
  nextRouter: NextRouter,
  pageProps: any,
) {
  // TODO: allow developer to supply their own function which accepts Component/pathname
  // and returns whether this is a retil component or not
  const basename = nextRouter.pathname.replace(/\/\[\[\.\.\.retil\]\]$/, '')

  const pageRouter = routeNotFoundBoundary(
    basename !== nextRouter.pathname
      ? (req: RouterRequest, res: RouterResponse) =>
          (Component as any)(
            {
              ...req,
              props: pageProps,
            },
            res,
          )
      : () => <Component {...pageProps} />,
    () => (
      <>
        <h1>Not Found</h1>
      </>
    ),
  )

  return {
    basename,
    pageRouter,
  }
}

RetilApp.getInitialProps = async ({
  Component,
  router: nextRouter,
  ctx,
}: AppContext) => {
  const pageProps = Component.getInitialProps
    ? await Component.getInitialProps(ctx)
    : {}

  const url = nextRouter.asPath
  const { basename, pageRouter } = getRouterAndBasename(
    Component,
    nextRouter,
    pageProps,
  )

  if (ctx.req && ctx.res) {
    const [state, response] = await getInitialStateAndResponse(
      pageRouter,
      url,
      { basename },
    )

    ;(ctx as any).initialRouterState = state

    const { status = 200, headers } = response
    if (status >= 300 && status < 400) {
      ctx.res.writeHead(status, {
        ...headers,
        'Content-Type': 'text/html; charset=utf-8',
      })
      ctx.res.end()
      return
    }
    ctx.res.statusCode = status
  }

  return {
    pageProps,
  }
}

// TODO: generate mapPathnameToRoute in document wrapper based on filesystem
const mapPathnameToRoute = (pathname: string) => {
  if (pathname.startsWith('/pages')) {
    return '/pages/[[...retil]]'
  } else {
    return pathname
  }
}

export default function RetilApp({
  Component,
  initialRouterState,
  router: nextRouter,
  pageProps,
}: RetilAppProps) {
  const { basename, pageRouter } = useMemo(
    () => getRouterAndBasename(Component, nextRouter, pageProps),
    [Component, nextRouter, pageProps],
  )

  const history = useMemo(
    () => createNextHistory(nextRouter, mapPathnameToRoute),
    [nextRouter],
  )

  const route = useRouter(pageRouter, {
    basename,
    history,
    initialState: initialRouterState,
  })

  return (
    <RouterProvider state={route}>
      <React.Suspense fallback="loading...">{route.content}</React.Suspense>
    </RouterProvider>
  )
}
