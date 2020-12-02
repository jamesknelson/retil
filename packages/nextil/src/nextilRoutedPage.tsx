import { NextPageContext } from 'next'
import {
  RouterFunction,
  getInitialSnapshot,
  createRequest,
  routeNotFoundBoundary,
} from 'retil-router'
import { FusorUse, fuse, getSnapshotPromise } from 'retil-source'

import { BypassSerializationHack } from './nextilConstants'
import { latestNextilStateRef } from './nextilHistory'
import { notFoundRouterRef } from './nextilNotFound'
import {
  NextilRequest,
  NextilResponse,
  NextilRoutedPageInitialProps,
  NextilRoutedPageUnserializedAppProps,
  NextilState,
} from './nextilTypes'

export interface NextilRoutedPageOptions<Ext> {
  basename?: string
  extendRequest?: (request: NextilRequest, use: FusorUse) => Ext
  extractSerializedData?: (
    request: NextilRequest & Ext,
    response: NextilResponse,
  ) => Promise<any>
}

export function nextilRoutedPage<Ext>(
  router: RouterFunction<NextilRequest & Ext, NextilResponse>,
  options: NextilRoutedPageOptions<Ext> = {},
) {
  // Next expects to receive a component, but it will never actually be
  // rendered.
  const NextilRoutedPage = () => null

  NextilRoutedPage.getNextilState = (
    pageName: string,
    params: any,
    pageProps?: NextilRoutedPageInitialProps,
  ): NextilState => {
    const basename = options.basename ?? getDefaultBasename(pageName, params)

    return {
      basename,
      extendRequest: options.extendRequest,
      isRoutedPage: true,
      isSSR: false,
      params,
      router,
      serializedData: pageProps?.serializedData,
    }
  }

  NextilRoutedPage.getInitialProps = async (
    ctx: NextPageContext,
  ): Promise<NextilRoutedPageInitialProps | void> => {
    const url = ctx.asPath!
    const nextilState = NextilRoutedPage.getNextilState(ctx.pathname, ctx.query)
    const unserializedProps: NextilRoutedPageUnserializedAppProps = {
      nextilState,
    }
    const initialProps: NextilRoutedPageInitialProps = {
      bypassSerializationWrapper: {
        [BypassSerializationHack]: unserializedProps,
      },
    }

    latestNextilStateRef.current = nextilState

    // Only get the full response before returning on the server
    if (ctx.req && ctx.res) {
      nextilState.isSSR = true
      nextilState.serverRequest = ctx.req
      nextilState.serverResponse = ctx.res

      const nextilRequest = createRequest<NextilState>(url, nextilState)
      const extendedRequest = options.extendRequest
        ? await getSnapshotPromise(
            fuse((use) => {
              const extension = options.extendRequest!(nextilRequest, use)
              return {
                ...nextilRequest,
                ...extension,
              }
            }),
          )
        : (nextilRequest as NextilRequest & Ext)

      const wrappedRouter = routeNotFoundBoundary(
        router,
        notFoundRouterRef.current,
      )
      const initialSnapshot = await getInitialSnapshot(
        wrappedRouter,
        extendedRequest,
      )

      initialProps.serializedData = await options.extractSerializedData?.(
        initialSnapshot.request,
        initialSnapshot.response,
      )
      unserializedProps.initialSnapshot = initialSnapshot

      const { status = 200, headers } = initialSnapshot.response
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

    return initialProps
  }

  return NextilRoutedPage
}

const NextilWildcardPattern = /\/\[\[\.\.\..*\]\]$/

function getDefaultBasename(pageName: string, params: object): string {
  let basename = pageName.replace(NextilWildcardPattern, '')

  for (const [param, value] of Object.entries(params)) {
    if (!Array.isArray(value)) {
      basename = basename.replace('[' + param + ']', value as string)
    }
  }

  return basename
}
