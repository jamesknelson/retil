import { NavAction, NavLocation, joinPathnames, parseLocation } from 'retil-nav'
import { emptyObject } from 'retil-support'

export type NavSchemeParams = Record<
  string,
  string | string[] | boolean | null | undefined
>

/**
 * As TypeScript allows anything to be assigned to {}, for routes which don't
 * take any params, we'll use this object instead.
 */
export type EmptyNavSchemeParams = {
  never?: never
}

// Allow null values to be passed into optional parameters
export type ExtendNavSchemeParams<TParams> = {
  [Key in keyof TParams]: undefined extends TParams[Key]
    ? TParams[Key] | null
    : TParams[Key]
}

export type NavSchemePathConfig<
  TParams extends NavSchemeParams = NavSchemeParams,
> =
  // https://stackoverflow.com/questions/52667959/what-is-the-purpose-of-bivariancehack-in-typescript-types
  { bivarianceHack(instance: TParams): NavAction }['bivarianceHack']

export type NavSchemeConfig = {
  [name: string]: NavScheme | NavSchemePathConfig
}

export type NavScheme = {
  [name: string]: NavScheme | NavSchemeLeaf<any>
}

export type NavSchemeLeaf<TParams extends NavSchemeParams = {}> =
  {} extends TParams
    ? (params?: EmptyNavSchemeParams) => NavLocation
    : (params: TParams) => NavLocation

export type NestableNavSchemeLeaf<
  TParams extends NavSchemeParams = NavSchemeParams,
> = { bivarianceHack(instance?: TParams): NavLocation }['bivarianceHack']

export type NestableNavScheme = {
  [name: string]: NavScheme | NestableNavSchemeLeaf
}

export type NestedNavSchemeAndLeaf<
  TScheme extends NestableNavScheme,
  TParams extends NavSchemeParams = {},
> = NavSchemeLeaf<TParams> & NestedNavScheme<TScheme, TParams>

export type NestedNavScheme<
  TScheme extends NestableNavScheme,
  TParams extends NavSchemeParams = {},
> = {} extends TParams ? TScheme : NestedNavSchemeWithParams<TScheme, TParams>

// ---

export type NavSchemeFromConfig<TConfig extends NavSchemeConfig> = {
  [Key in Extract<
    keyof TConfig,
    string
  >]: TConfig[Key] extends NestedNavSchemeAndLeaf<infer IScheme, infer IParams>
    ? NestedNavSchemeAndLeaf<IScheme, IParams>
    : TConfig[Key] extends NavSchemePathConfig<any>
    ? NavSchemeLeafFromConfig<TConfig[Key]>
    : TConfig[Key]
}

export type NavSchemeLeafFromConfig<TConfig extends NavSchemePathConfig<any>> =
  TConfig extends () => NavAction
    ? (params?: EmptyNavSchemeParams) => NavLocation
    : TConfig extends (params: infer IParams) => NavAction
    ? (params: ExtendNavSchemeParams<IParams>) => NavLocation
    : never

// ---

export type NestedNavSchemeWithParams<
  TScheme extends NavScheme,
  TParams extends NavSchemeParams = {},
> = {
  [Key in Extract<keyof TScheme, string>]: TScheme[Key] extends NavScheme
    ? NestedNavSchemeWithParams<TScheme[Key], TParams>
    : TScheme[Key] extends (params?: EmptyNavSchemeParams) => NavAction
    ? (params: TParams) => NavLocation
    : TScheme[Key] extends (params: infer IRequiredKeyParams) => NavAction
    ? (params: IRequiredKeyParams & TParams) => NavLocation
    : TScheme[Key] extends () => NavLocation
    ? (params: TParams) => NavAction
    : never
}

// ---

export const nestedNavSchemeSymbol = Symbol()

export function createScheme<TConfig extends NavSchemeConfig>(
  config: TConfig,
): NavSchemeFromConfig<TConfig> {
  const keys = Object.keys(config)
  const scheme = {} as NavScheme
  for (const key of keys) {
    const value = config[key]
    scheme[key] =
      nestedNavSchemeSymbol in value
        ? (value as NavScheme)
        : (params: NavSchemeParams = {}) =>
            parseLocation((value as NavSchemePathConfig)(params))
  }
  return scheme as NavSchemeFromConfig<TConfig>
}

export function nestScheme<
  TScheme extends NestableNavScheme,
  TParams extends NavSchemeParams = {},
>(
  root: string | NavSchemePathConfig<TParams>,
  scheme: TScheme,
): NestedNavSchemeAndLeaf<TScheme, TParams> {
  const leaf = typeof root !== 'string' ? root : () => root

  const handler: ProxyHandler<NestableNavSchemeLeaf> = {
    apply: (target, thisArg, argumentsList) => {
      const head = parseLocation(leaf.apply(thisArg, [argumentsList[0] || {}]))
      if (target === leaf) {
        return head
      }
      const tail = target.apply(thisArg, [argumentsList[0] || {}])
      return parseLocation({
        pathname: joinPathnames(head.pathname || '', tail?.pathname || ''),
        query: (head.query || tail?.query) && {
          ...head.query,
          ...tail?.query,
        },
      })
    },
    get: (target, key) => {
      if (key === nestedNavSchemeSymbol) {
        return true
      }
      const child = scheme[key as string]
      if (child) {
        return new Proxy(child, handler)
      }
      return Reflect.get(target, key)
    },
    has: (target, key) => {
      if (key === nestedNavSchemeSymbol) {
        return true
      }
      return Reflect.has(scheme, key) || Reflect.has(target, key)
    },
    ownKeys: (target) =>
      Reflect.ownKeys(scheme).concat(Reflect.ownKeys(target)),
  }

  return new Proxy(leaf, handler) as NestedNavSchemeAndLeaf<TScheme, TParams>
}

export function patternFor<TParams extends NavSchemeParams>(
  getter: (
    | ((params?: EmptyNavSchemeParams) => NavLocation)
    | ((params: TParams) => NavLocation)
  ) & {
    [nestedNavSchemeSymbol]?: true
  },
  options: {
    optional?: (keyof TParams)[]
  } = {},
): string {
  const { optional = [] } = options
  const { pathname } = getter(
    new Proxy(emptyObject as any, {
      get: (_target, prop) =>
        ':' +
        (typeof prop === 'string' && optional.includes(prop)
          ? prop + '?'
          : String(prop)),
    }),
  )
  const wildcard = nestedNavSchemeSymbol in getter ? '*' : ''
  return pathname + wildcard
}
