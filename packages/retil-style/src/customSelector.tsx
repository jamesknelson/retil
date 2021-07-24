import React, { useContext, useMemo } from 'react'
import { memoizeOne } from 'retil-support'

import {
  RetilCSSInterpolationContext,
  retilCSSInterpolationContextSymbol,
  retilCSSReactContext,
  useCSSContext,
} from './context'
import {
  CSSInterpolation,
  CSSInterpolationFunction,
  CSSSelector,
  CSSTheme,
} from './cssTypes'

const serializedCustomSelectorTuplePrefix = ':rx-'
const customSelectorTypeSymbol = Symbol.for('retil:css:customSelectorType')

export type CustomSelectorTypeOptions<Context, Config> = (
  selectorId: string,
  config: Config,
  context?: Context,
) => CSSSelector

export interface CustomSelectorType<Context, Config> {
  createSelector: (config: Config) => CustomSelector<Config> & string
  parseSelectorDefinition: (
    selectorString: string,
  ) => null | CustomSelectorDefinition<Config>
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
export interface CustomSelectorDefinition<Config> {
  readonly [customSelectorTypeSymbol]: number
  readonly id: string
  readonly config: Config
}

export interface CustomSelector<Config>
  extends CustomSelectorDefinition<Config> {
  toString(): string

  (
    strings: TemplateStringsArray,
    ...interpolations: Array<CSSInterpolation>
  ): CSSInterpolationFunction
  (...args: Array<CSSInterpolation>): CSSInterpolationFunction
}

// Registering each selector type ensures that they'll have a unique index
// to store their context information in – preventing any conflicts that may
// be caused if keys are defined manually.

const registeredSelectorTypeOptions = [] as CustomSelectorTypeOptions<
  any,
  any
>[]

export function resetRegisteredSelectorTypes() {
  registeredSelectorTypeOptions.length = 0
}

export function registerSelectorType<Context, Config>(
  getSelector: CustomSelectorTypeOptions<Context, Config>,
): CustomSelectorType<Context, Config> {
  const typeIndex = registeredSelectorTypeOptions.length

  registeredSelectorTypeOptions.push(getSelector)

  let nextSelectorId = 1

  const createSelector = (config: Config): CustomSelector<Config> & string => {
    const selectorId = String(nextSelectorId++)
    const serializedConfig = serializeCustomSelectorTuple([
      typeIndex,
      selectorId,
      config,
    ])

    const toString = () => serializedConfig

    const runtimeWrapper = (
      initialArg: TemplateStringsArray | CSSInterpolation,
      ...args: CSSInterpolation[]
    ): CSSInterpolationFunction => {
      if (args.length === 0 && Array.isArray(initialArg)) {
        args = initialArg
      } else {
        args = [initialArg as CSSInterpolation].concat(args)
      }

      const cssFunction: CSSInterpolationFunction = (props) => {
        const theme =
          'theme' in props
            ? (
                props as {
                  theme: {
                    [retilCSSInterpolationContextSymbol]: RetilCSSInterpolationContext
                  }
                }
              )['theme']
            : (props as {
                [retilCSSInterpolationContextSymbol]: RetilCSSInterpolationContext
              })

        const { customSelectors, runtime } =
          theme[retilCSSInterpolationContextSymbol]
        const context = customSelectors[typeIndex] as Context | undefined
        const selector = getSelector(selectorId, config, context)

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

    const customSelector: CustomSelector<Config> = Object.assign(
      runtimeWrapper,
      {
        [customSelectorTypeSymbol]: typeIndex,
        id: selectorId,
        config,
        toString,
      },
    )

    return customSelector as CustomSelector<Config> & string
  }

  const parseSelectorDefinition = (
    input: string,
  ): null | CustomSelectorDefinition<Config> => {
    const tuple = parseCustomSelectorTuple(input)
    if (!tuple || tuple[0] !== typeIndex) {
      return null
    } else {
      const [, selectorId, config] = tuple
      return {
        [customSelectorTypeSymbol]: typeIndex,
        id: selectorId,
        config: config as Config,
      }
    }
  }

  const useSelectorContext = (
    themeContextArg?: React.Context<CSSTheme>,
  ): Context | undefined =>
    useCSSContext(themeContextArg)?.customSelectors?.[typeIndex] as
      | Context
      | undefined

  const useSelectorProvider = (
    updateContext: (context?: Context) => Context | null,
    themeContextArg?: React.Context<CSSTheme>,
  ) => {
    const defaultThemeContext = useContext(retilCSSReactContext)
    const themeContext = themeContextArg ?? defaultThemeContext
    const theme = useContext(themeContext)
    const memoizedUpdate = useMemo(() => memoizeOne(mergeContextIntoTheme), [])
    const extendedTheme = memoizedUpdate(theme, typeIndex, updateContext)
    const provide = (children: React.ReactNode) => (
      <themeContext.Provider children={children} value={extendedTheme} />
    )
    return provide
  }

  return {
    createSelector,
    parseSelectorDefinition,
    useSelectorContext,
    useSelectorProvider,
  }
}

export function useCSSSelectors(
  selectors: (string | CustomSelector<unknown>)[],
  themeContextArg?: React.Context<CSSTheme>,
): CSSSelector[] {
  const context = useCSSContext(themeContextArg)
  return selectors.map((selector) => getCSSSelector(selector, context))
}

export function getCSSSelector(
  selector: CustomSelector<unknown> | string,
  context?: RetilCSSInterpolationContext,
): CSSSelector {
  const tuple =
    typeof selector === 'string'
      ? parseCustomSelectorTuple(selector)
      : ([
          selector[customSelectorTypeSymbol],
          selector.id,
          selector.config,
        ] as CustomSelectorTuple)
  if (!tuple) {
    return selector as string
  } else {
    const [selectorTypeIndex, selectorId, config] = tuple
    const getSelector = registeredSelectorTypeOptions[selectorTypeIndex]
    return getSelector(
      selectorId,
      config,
      context?.customSelectors[selectorTypeIndex],
    )
  }
}

type CustomSelectorTuple = readonly [
  customSelectorTypeIndex: number,
  selectorId: string,
  serializableConfig: unknown,
]

function isSerializedCustomSelectorTuple(str: string) {
  return (
    str.slice(0, serializedCustomSelectorTuplePrefix.length) ===
    serializedCustomSelectorTuplePrefix
  )
}

function parseCustomSelectorTuple(input: string): null | CustomSelectorTuple {
  const keyString = input.toString()
  return isSerializedCustomSelectorTuple(input)
    ? JSON.parse(keyString.slice(serializedCustomSelectorTuplePrefix.length))
    : null
}

function serializeCustomSelectorTuple(tuple: CustomSelectorTuple) {
  return serializedCustomSelectorTuplePrefix + JSON.stringify(tuple)
}

function mergeContextIntoTheme<Context>(
  theme: CSSTheme,
  typeIndex: number,
  updateContext: (context?: Context) => Context | null,
): CSSTheme {
  const { customSelectors, runtime } =
    theme?.[retilCSSInterpolationContextSymbol]!
  const selectorContext = customSelectors[typeIndex] as Context | undefined
  const updatedContext = updateContext(selectorContext)

  return updatedContext === null
    ? theme
    : {
        ...theme,
        [retilCSSInterpolationContextSymbol]: {
          runtime: runtime,
          customSelectors: {
            ...customSelectors,
            [typeIndex]: updatedContext,
          },
        },
      }
}
