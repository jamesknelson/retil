import type { VectorSource } from 'retil-source'

export type NavTrigger = 'PUSH' | 'REPLACE' | 'POP'

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

export interface NavResponse {
  getHeaders(): { [name: string]: number | string | string[] | undefined }
  setHeader(name: string, value: number | string | string[] | undefined): void
  statusCode: number
}

export type NavQuery = { [name: string]: string | string[] }
export type NavParams = { [name: string]: string | string[] }

export interface NavEnv extends NavLocation {
  basename: string
  navKey: string
  params: NavParams
  redirect: NavRedirectFunction
  response: NavResponse
}

export type NavSource = VectorSource<NavEnv>

export type NavService = readonly [NavSource, NavController]

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
  location: NavLocation,
  trigger: NavTrigger,
) => Promise<boolean>

export type NavReducer = (
  location: NavLocation,
  action: NavAction,
) => NavLocation

export type Canceller = () => void
