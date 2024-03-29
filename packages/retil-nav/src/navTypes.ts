import type { Source } from 'retil-source'

export type NavTrigger = 'PUSH' | 'REPLACE' | 'POP' | 'UNLOAD'

export type NavAction = string | NavActionObject

export interface NavActionObject {
  hash?: string
  pathname?: string
  query?: NavQuery
  search?: string
  state?: object | null
}

export interface NavLocation {
  hash: string
  pathname: string
  query: NavQuery
  search: string
  state: object | null
}

/**
 * The `redirect` function returns null, as a redirect response should result
 * in a new nav snapshot being rendered, with the original one being abandoned.
 */
export interface NavRedirectFunction {
  (action: NavAction): null
  (statusCode: number, action: NavAction): null
}

export type NavQuery = {
  [name: string]: undefined | string | readonly string[]
}
export type NavParams = {
  [name: string]: undefined | string | readonly string[]
}

export interface NavEnv<
  TRequest extends NavRequest = NavRequest,
  TResponse extends NavResponse = NavResponse,
> {
  nav: NavSnapshot
  request?: TRequest
  response?: TResponse
}

export interface NavSnapshot extends NavLocation {
  basename: string
  key: string
  matchname: string

  /**
   * Returns `never`, as the return should never actually be used.
   */
  notFound: () => null

  params: NavParams
  precache(action: NavAction): void
  redirect: NavRedirectFunction
}

export interface NavRequest {
  baseUrl?: string
  originalUrl?: string
  params?: NavParams
  query?: NavQuery
  url: string
}

export interface NavResponse {
  getHeaders(): {
    [name: string]: number | string | readonly string[] | undefined
  }
  setHeader(
    name: string,
    value: number | string | readonly string[] | undefined,
  ): void
  statusCode?: number
}

export type NavEnvSource = Source<NavEnv>

export type NavEnvService = readonly [NavEnvSource, NavController]

export interface NavController {
  back(): void

  block(blocker: NavBlockPredicate): Canceller

  go(count: number): void

  navigate(
    action: NavAction,
    options?: {
      /**
       * Bypass any blocks and navigate immediately. Useful for redirects, which
       * should not be blocked.
       */
      replace?: boolean
    },
  ): Promise<boolean>

  precache(action: NavAction): Canceller
}

export type NavBlockPredicate = (
  location: NavLocation | null,
  trigger: NavTrigger,
) => boolean | Promise<boolean>

export type NavReducer = (
  location: NavLocation,
  action: NavAction,
) => NavLocation

export type Canceller = () => void
