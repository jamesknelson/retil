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

export interface NavRedirectFunction {
  (action: string): Promise<void>
  (statusCode: number, action: string): Promise<void>
}

export type NavQuery = { [name: string]: undefined | string | string[] }
export type NavParams = { [name: string]: undefined | string | string[] }

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
  notFound(): void
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
  getHeaders(): { [name: string]: number | string | string[] | undefined }
  setHeader(name: string, value: number | string | string[] | undefined): void
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
