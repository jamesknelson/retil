import * as React from 'react'
import {
  RouterFunction,
  RouterRequest,
  RouterResponse,
  parseLocation,
} from 'retil-router'

import { NextilAppOptions, NextilPageDetails } from './nextilTypes'

export interface GetNextilStateOptions {
  appOptions: NextilAppOptions
  pageDetails: NextilPageDetails
}

export function getNextilState({
  appOptions,
  pageDetails,
}: GetNextilStateOptions & NextilAppOptions) {
  const {
    getAppRouter,
    getFallbackComponentRouter = defaultGetFallbackComponentRouter,
    getPageBasenameAndRouter = defaultGetPageBasenameAndRouter,
  } = appOptions
  const { url, getInitialPropsResult, params } = pageDetails

  const pageBasenameAndRouter = getPageBasenameAndRouter(pageDetails)
  const hasPageRouter = !!pageBasenameAndRouter
  const pageRouter = pageBasenameAndRouter
    ? pageBasenameAndRouter.router
    : getFallbackComponentRouter(pageDetails)

  const router = getAppRouter
    ? getAppRouter(pageRouter, pageDetails)
    : pageRouter

  const basename = pageBasenameAndRouter
    ? pageBasenameAndRouter.basename
    : parseLocation(url).pathname

  return {
    basename,
    hasPageRouter,
    getInitialPropsResult,
    params,
    router,
  }
}

//---

const NextilWildcardPattern = /\/\[\[\.\.\..*\]\]$/

const defaultGetFallbackComponentRouter = ({
  defaultExport: Component,
  getInitialPropsResult: pageProps,
}: NextilPageDetails): RouterFunction<any, any> => () => (
  <Component {...pageProps} />
)

const defaultGetPageBasenameAndRouter = (
  pageDetails: NextilPageDetails,
): null | {
  basename: string
  router: RouterFunction<any, any>
} => {
  if (!NextilWildcardPattern.test(pageDetails.pageName)) {
    return null
  }

  // TODO: need to convert pageName to a pattern, and use that to match
  // the part of the `asPath` that is the basename
  let basename = pageDetails.pageName.replace(NextilWildcardPattern, '')

  for (const [param, value] of Object.entries(pageDetails.params)) {
    if (!Array.isArray(value)) {
      basename = basename.replace('[' + param + ']', value as string)
    }
  }

  return {
    basename,
    router: (req: RouterRequest<any>, res: RouterResponse) =>
      (pageDetails.defaultExport as any)(
        {
          ...req,
          getInitialPropsResult: pageDetails.getInitialPropsResult,
        },
        res,
      ),
  }
}
