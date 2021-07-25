import React, { useContext, useMemo } from 'react'
import { memoizeOne } from 'retil-support'

import {
  CSSThemeRider,
  cssThemeRiderSymbol,
  cssThemeContextContext,
  useCSSTheme,
} from './cssContext'
import { CSSInterpolationContext, CSSSelector, CSSTheme } from './cssTypes'

const serializedSelectorTuplePrefix = ':rx-'
const selectorTypeSymbol = Symbol.for('retil:style:selectorType')

// Registering each selector type ensures that they'll have a unique index
// to store their context information in – preventing any conflicts that may
// be caused if keys are defined manually.

const selectorTypeRegister = [] as {
  keyFunction: SelectorKeyFunction<any, any>
  selectorType: SelectorType<any, any>
}[]

export type SelectorKeyFunction<Context, Config> = (
  key: string,
  config: Config,
  context?: Context,
) => CSSSelector

export interface SelectorType<Context, Config> {
  createSelector: (config: Config) => Selector<Config> & string
  parseSelectorDefinition: (
    selectorString: string,
  ) => null | SelectorDefinition<Config>
  useSelectorContext: (
    themeContext?: React.Context<CSSTheme>,
  ) => Context | undefined
  useSelectorProvider: (
    updateContext: (context?: Context) => Context | null,
    themeContext?: React.Context<CSSTheme>,
  ) => (children: React.ReactNode) => React.ReactElement
}

/**
 * The selector definition contains all data needed to create an actual selector
 * object.
 */
export interface SelectorDefinition<Config> {
  readonly [selectorTypeSymbol]: number
  readonly key: string
  readonly config: Config
}

export interface Selector<Config> extends SelectorDefinition<Config> {
  toString(): string

  <
    TTheme extends CSSTheme,
    TInterpolationContext extends CSSInterpolationContext<TTheme>,
    TStyles extends boolean | string | any[] | Record<string, any>,
  >(
    ...styles: (((context: TInterpolationContext) => TStyles) | TStyles)[]
  ): (interpolationContext: TInterpolationContext) => TStyles
}

export function resetRegisteredSelectorTypes() {
  selectorTypeRegister.length = 0
}

export function getOrRegisterSelectorType<Context, Config>(
  keyFunction: SelectorKeyFunction<Context, Config>,
): SelectorType<Context, Config> {
  const selectorType = selectorTypeRegister.find(
    (item) => keyFunction === item.keyFunction,
  )?.selectorType
  return selectorType || registerSelectorType(keyFunction)
}

export function useCSSSelectors(
  selectors: (string | Selector<unknown>)[],
  themeContextArg?: React.Context<CSSTheme>,
): CSSSelector[] {
  const context = useCSSTheme(themeContextArg)
  return selectors.map((selector) => getCSSSelector(selector, context))
}

export function getCSSSelector(
  selector: Selector<unknown> | string,
  context?: CSSThemeRider,
): CSSSelector {
  const tuple =
    typeof selector === 'string'
      ? parseSelectorTuple(selector)
      : ([
          selector[selectorTypeSymbol],
          selector.key,
          selector.config,
        ] as SelectorTuple)
  if (!tuple) {
    return selector as string
  } else {
    const [selectorTypeIndex, selectorId, config] = tuple
    const keyFunction = selectorTypeRegister[selectorTypeIndex].keyFunction
    return keyFunction(
      selectorId,
      config,
      context?.selectorTypeContexts[selectorTypeIndex],
    )
  }
}

function registerSelectorType<Context, Config>(
  keyFunction: SelectorKeyFunction<Context, Config>,
): SelectorType<Context, Config> {
  const typeIndex = selectorTypeRegister.length

  let nextSelectorId = 1

  const createSelector = (config: Config): Selector<Config> & string => {
    const key = String(nextSelectorId++)

    const serializedConfig = serializeSelectorTuple([typeIndex, key, config])

    const toString = () => serializedConfig

    const runtimeWrapper = (initialArg: any, ...args: any[]): Function => {
      if (args.length === 0 && Array.isArray(initialArg)) {
        args = initialArg
      } else {
        args = [initialArg].concat(args)
      }

      const cssFunction = (props: any) => {
        const theme =
          'theme' in props
            ? (
                props as {
                  theme: {
                    [cssThemeRiderSymbol]: CSSThemeRider
                  }
                }
              )['theme']
            : (props as {
                [cssThemeRiderSymbol]: CSSThemeRider
              })

        const { selectorTypeContexts, runtime } = theme[cssThemeRiderSymbol]
        const context = selectorTypeContexts[typeIndex] as Context | undefined
        const selector = keyFunction(key, config, context)

        if (selector === true) {
          return args
        } else if (selector) {
          return runtime`${selector} { ${args.map((arg) =>
            typeof arg === 'function' ? arg(props) : arg,
          )} }`
        }
      }

      return cssFunction
    }

    const selector: Selector<Config> = Object.assign(
      runtimeWrapper as (interpolationContext: any) => any,
      {
        [selectorTypeSymbol]: typeIndex,
        key,
        config,
        toString,
      },
    )

    return selector as Selector<Config> & string
  }

  const parseSelectorDefinition = (
    input: string,
  ): null | SelectorDefinition<Config> => {
    const tuple = parseSelectorTuple(input)
    if (!tuple || tuple[0] !== typeIndex) {
      return null
    } else {
      const [, selectorId, config] = tuple
      return {
        [selectorTypeSymbol]: typeIndex,
        key: selectorId,
        config: config as Config,
      }
    }
  }

  const useSelectorContext = (
    themeContextArg?: React.Context<CSSTheme>,
  ): Context | undefined =>
    useCSSTheme(themeContextArg)?.selectorTypeContexts?.[typeIndex] as
      | Context
      | undefined

  const useSelectorProvider = (
    updateContext: (context?: Context) => Context | null,
    themeContextArg?: React.Context<CSSTheme>,
  ) => {
    const defaultThemeContext = useContext(cssThemeContextContext)
    const themeContext = themeContextArg ?? defaultThemeContext
    const theme = useContext(themeContext)
    const memoizedUpdate = useMemo(() => memoizeOne(mergeContextIntoTheme), [])
    const extendedTheme = memoizedUpdate(theme, typeIndex, updateContext)
    const provide = (children: React.ReactNode) => (
      <themeContext.Provider children={children} value={extendedTheme} />
    )
    return provide
  }

  const selectorType = {
    createSelector,
    parseSelectorDefinition,
    useSelectorContext,
    useSelectorProvider,
  }

  selectorTypeRegister.push({ keyFunction, selectorType })

  return selectorType
}

type SelectorTuple = readonly [
  selectorTypeIndex: number,
  key: string,
  serializableConfig: unknown,
]

function isSerializedSelectorTuple(str: string) {
  return (
    str.slice(0, serializedSelectorTuplePrefix.length) ===
    serializedSelectorTuplePrefix
  )
}

function parseSelectorTuple(input: string): null | SelectorTuple {
  const keyString = input.toString()
  return isSerializedSelectorTuple(input)
    ? JSON.parse(keyString.slice(serializedSelectorTuplePrefix.length))
    : null
}

function serializeSelectorTuple(tuple: SelectorTuple) {
  return serializedSelectorTuplePrefix + JSON.stringify(tuple)
}

function mergeContextIntoTheme<Context>(
  theme: CSSTheme,
  typeIndex: number,
  updateContext: (context?: Context) => Context | null,
): CSSTheme {
  const { selectorTypeContexts, runtime } = theme?.[cssThemeRiderSymbol]!
  const context = selectorTypeContexts[typeIndex] as Context | undefined
  const updatedContext = updateContext(context)

  return updatedContext === null
    ? theme
    : {
        ...theme,
        [cssThemeRiderSymbol]: {
          runtime: runtime,
          selectorTypeContexts: {
            ...selectorTypeContexts,
            [typeIndex]: updatedContext,
          },
        },
      }
}
