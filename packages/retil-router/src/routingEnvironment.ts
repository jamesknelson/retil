import type { ParsedUrlQuery } from 'querystring'
import { Fusor, Source, filter, fuse, mergeLatest, select } from 'retil-source'

export interface RoutingRedirectFunction {
  redirect(url: string): Promise<void>
  redirect(statusCode: number, url: string): Promise<void>
}

export interface RoutingEnvironmentResponse {
  getHeaders(): { [name: string]: number | string | string[] }
  setHeader(name: string, value: number | string | string[]): void
  statusCode: number
}

// TODO: this doesn't exactly work, as "basename" needs to differ at different
// points in the request tree.

export interface Location {
  hash: string
  pathname: string
  query: ParsedUrlQuery
  search: string
  state: object | null
}

export interface HistoryLocation extends Location {
  historyKey: string
}

export interface RetilEnvironment extends HistoryLocation {
  basename: string
  params: { [name: string]: string | string[] }
  redirect: RoutingRedirectFunction
  response: RoutingEnvironmentResponse
}

export interface SuspenseTracker {
  isReady(): boolean

  /**
   * Wait until all suspenses added to the response have resolved. This is
   * useful when using renderToString – but not necessary for the streaming
   * renderer.
   */
  waitUntilReady(): Promise<void>

  /**
   * Allows a router to indicate that the content will currently suspend,
   * and if it is undesirable to render suspending content, the router should
   * wait until there are no more pending promises.
   */
  willNotBeReadyUntil(promise: PromiseLike<any>): void
}

export interface InjectedRouteProps {
  abortSignal: AbortSignal
  routeKey: symbol
  suspenseTracker: SuspenseTracker
}

export interface RetilRouteProps extends RetilEnvironment, InjectedRouteProps {}

export type RouterFunction<
  Snapshot extends RouterRouteSnapshot = RouterRouteSnapshot
> = (snapshot: Readonly<Snapshot>) => ReactNode

const PrecacheSymbol = Symbol('precache')

export type Precache<T extends object> = readonly [typeof PrecacheSymbol, T]

export type MaybePrecached<T extends object> = T | Precache<T>

export function createPrecache<T extends object>(x: T): Precache<T> {
  return [PrecacheSymbol, x]
}

export function isPrecache<T extends object>(
  x: T | Precache<T> | any,
): x is Precache<T> {
  return Array.isArray(x) && x[0] === PrecacheSymbol
}

class WeakArrayMap<K extends object, V> {
  clear(): void {}
  get(keys: K[]): V | null {}
  has(keys: K[]): boolean {}
  set(keys: K[], value: V): void {}
}

type Used = readonly [
  source: Source<any>,
  defaultValues: [any] | [],
  snapshot: any,
]

export function fuseMaybePrecached<T extends object>(fusor: PureFusor<T>) {
  const precache = new WeakArrayMap<Source<any>, (readonly [Used[], T])[]>()

  const clearCache = () => {
    precache.clear()
  }

  // todo: I think we want to store all combinations of sources that have
  // been used to precache, along with a list of all sources in total,
  // and check each combination

  const source = fuse((use, effect) => {
    if (precache) {
      const cachedSources = Array.from(precache.used.entries())
      const currentValues = cachedSources.map(([source, defaultValue]) =>
        use(source, defaultValue),
      )
      const isActual = currentValues.every(isNotPrecache)

      if (isActual) {
        // Check `hasPrecachedValue` separately to `precachedValue`, in case
        // there is a precached falsy value.
        const hasPrecachedValue = precache.precachedValues.has(currentValues)
        const precachedValue = precache.precachedValues.get(currentValues)

        clearCache()

        if (hasPrecachedValue) {
          return precachedValue
        }
      }
    }

    const precachedSources = [] as Source<any>[]
    const used = [] as [
      source: Source<any>,
      defaultValues: [any] | [],
      snapshot: any,
    ][]

    // Keep track of what is used, so that if we find we're producing a
    // precached value, we can keep track of the inputs that correspond
    // to it.
    const wrappedUse = <T, U>(
      source: Source<T>,
      ...defaultValues: [U] | []
    ) => {
      if (process.env.NODE_ENV !== 'production') {
        if (defaultValues.length && isPrecache(defaultValues[0])) {
          throw new Error(
            "You can't use a precache value as a default value for use()",
          )
        }
      }

      const snapshot = use(source, ...defaultValues)

      if (isPrecache(snapshot)) {
        precachedSources.push(source)
      }

      used.push([source, defaultValues, snapshot])

      return snapshot
    }

    const snapshot = fusor(wrappedUse, effect)

    if (precachedSources.length === 0) {
      precache.clear()
      return snapshot
    } else {
      // TODO: append to cache

      return createPrecache(snapshot)
    }
  }, clearCache)
}

export function extendEnvironmentSource(
  environmentSource,
  getExtension: (
    environmentSnapshot: Environment,
  ) => MaybePrecachedFusor | object,
) {
  return fuseMaybePrecached((use) => {
    const environmentSnapshot = use(environmentSource)
    const extension = getExtension(environmentSnapshot)
    return {
      ...extension,
      ...(typeof extension === 'function' ? extension(use) : extension),
    }
  })
}

export function route(routerFunction, environmentSource)
export function route(
  routerFunction,
  environmentExtension: (
    environment: Environment,
  ) => MaybePrecachedFusor | object,
)
export function route(
  routerFunction,
  environmentSource,
  environmentExtension: (
    environment: Environment,
  ) => MaybePrecachedFusor | object,
)
export function route<
  Environment extends RetilEnvironment = RetilEnvironment,
  EnvironmentExtension extends object = {}
>(
  routerFunction: RouterFunction,
  environmentSourceOrExtenion,
  environmentExtension?,
) {
  const extendedEnvironmentSource: Source<Environment & EnvironmentExtension>

  const source = fuseMaybePrecached((use) => {
    const environmentSnapshot = use(extendedEnvironmentSource)
    const abortController = new AbortController()
    const routeKey = Symbol()
    const routeProps = {
      ...environentSnapshot,

      abortSignal: abortController.signal,
      routeKey,
      suspenseTracker: new SuspenseTracker(),
    }

    return [routeProps, routerFunction(routeProps)]
  })

  return mergeLatest(filter(source, isNotPrecache))
}
