import { NextPageContext } from 'next'
import { RouterFunction, RouterRequest } from 'retil-router'

export interface NextilAppProps {
  nextilRouter: RouterFunction<NextilRequest>
}

export interface NextilAppOptions {
  getAppRouter?: (
    router: RouterFunction,
    pageDetails: NextilPageDetails,
  ) => RouterFunction<any, any>
  getFallbackComponentRouter?: (
    pageDetails: NextilPageDetails,
  ) => RouterFunction<any, any>
  getPageBasenameAndRouter?: (
    pageDetails: NextilPageDetails,
  ) => null | {
    basename: string
    router: RouterFunction<any, any>
  }
}

export interface NextilRequest extends RouterRequest, NextilRequestExtension {}

export interface NextilRequestExtension {
  hasPageRouter: boolean
  getInitialPropsResult: any
  router: RouterFunction<any, any>
}

export interface NextilPageDetails {
  ctx?: NextPageContext
  defaultExport: any
  getInitialPropsResult: any
  pageName: string
  params: any
  url: string
}

export interface NextilState {
  basename: string
  hasPageRouter: boolean
  getInitialPropsResult: any
  params: any
  router: RouterFunction<any, any>
}
