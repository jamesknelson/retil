import { IncomingMessage, ServerResponse } from 'http'
import { ParsedUrlQuery } from 'querystring'
import {
  RouterFunction,
  RouterRouteSnapshot,
  RouterResponse,
  RouterRouteSnapshot,
} from 'retil-router'
import { FusorUse } from 'retil-source'

import type { BypassSerializationHack } from './nextilConstants'

export interface NextilRequestExtension extends NextilState<any> {}

export type NextilRequest = RouterRouteSnapshot & NextilRequestExtension

export type NextilResponse = RouterResponse

export interface NextilState<Ext = any> {
  basename: string
  extendRequest?: NextilExtendRequestFunction<Ext>
  isRoutedPage: boolean
  isSSR: boolean
  serverRequest?: IncomingMessage
  serverResponse?: ServerResponse
  params: ParsedUrlQuery
  router: RouterFunction<NextilRequest & Ext, NextilResponse>
  serializedData?: any
}

export type NextilExtendRequestFunction<Ext> = (
  request: NextilRequest,
  use: FusorUse,
) => Ext

export interface NextilRoutedPageUnserializedAppProps {
  // This will *only* be available on the server
  initialSnapshot?: RouterRouteSnapshot<NextilRequest>
  // This will only be available on the server, and *after* the initial render
  // on the client
  nextilState?: NextilState
}

export interface NextilRoutedPageInitialProps {
  // By passing an object with a symbol, we can bypass serialization and pass
  // in raw objects from getInitialProps -- while ensuring they're not
  // serialized on the server.
  bypassSerializationWrapper: {
    [BypassSerializationHack]: NextilRoutedPageUnserializedAppProps
  }
  serializedData?: any
}
