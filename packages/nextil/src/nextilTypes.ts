import { RouterFunction, RouterRequest } from 'retil-router'

export interface NextilAppProps {
  nextilRouter: RouterFunction<RouterRequest<any> & NextilRequestExtension>
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

export type NextilRequest = RouterRequest<any> & NextilRequestExtension

export interface NextilRequestExtension {
  hasPageRouter: boolean
  getInitialPropsResult: any
  router: RouterFunction<any, any>
}

export interface NextilPageDetails {
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
