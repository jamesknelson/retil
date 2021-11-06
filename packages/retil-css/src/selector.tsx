import cartesian from 'fast-cartesian'
import partition from 'lodash/partition'
import React, { useContext, useMemo } from 'react'
import { memoizeOne } from 'retil-support'

import { selectionsSymbol, themeRiderSymbol } from './constants'
import { cssThemeContextContext, getThemeRider, useThemeRider } from './context'
import {
  CSSInterpolationContext,
  CSSSelector,
  CSSTheme,
  CSSThemeRider,
} from './types'

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

export interface SelectorFunction {
  <
    TTheme extends CSSTheme,
    TInterpolationContext extends CSSInterpolationContext<TTheme>,
    TStyles extends boolean | string | any[] | Record<string, any>,
  >(
    ...styles: (
      | ((
          context: TInterpolationContext & CSSInterpolationContext<TTheme>,
        ) => TStyles)
      | TStyles
    )[]
  ): SelectorInterpolation<TTheme, TInterpolationContext, TStyles>
}

export interface SelectorInterpolation<
  TTheme extends CSSTheme,
  TInterpolationContext extends CSSInterpolationContext<TTheme>,
  TStyles extends boolean | string | any[] | Record<string, any>,
> {
  (
    interpolationContext:
      | TInterpolationContext
      | CSSInterpolationContext<TTheme>,
  ): TStyles

  // These are stored to enable nesting of selectors
  [selectionsSymbol]?: SelectorSelection[]
}

interface SelectorSelection {
  args: any[]
  selectors: Selector<any>[]
}

export interface Selector<Config>
  extends SelectorDefinition<Config>,
    SelectorFunction {
  toString(): string
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
  const context = useThemeRider(themeContextArg)
  return context
    ? selectors.map((selector) => getCSSSelector(selector, context))
    : []
}

export function getCSSSelector(
  selector: Selector<unknown> | string,
  themeRider?: CSSThemeRider,
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
      themeRider?.selectorTypeContexts[selectorTypeIndex],
    )
  }
}

export function all(
  ...selectors: (Selector<unknown> | string)[]
): SelectorFunction {
  const allSelectorsWrapper = (initialArg: any, ...args: any[]): Function => {
    if (args.length === 0 && Array.isArray(initialArg)) {
      args = initialArg
    } else {
      args = [initialArg].concat(args)
    }

    const cssFunction = (props: any) => {
      const themeRider = getThemeRider(props)
      const cssSelectors = selectors.map((selector) =>
        getCSSSelector(selector, themeRider),
      )
      const cartesianInput = [] as string[][]

      for (const cssSelector of cssSelectors) {
        if (cssSelector === false) {
          return
        } else if (cssSelector !== true) {
          cartesianInput.push(
            Array.isArray(cssSelector) ? cssSelector : [cssSelector],
          )
        }
      }

      if (cartesianInput.length === 0) {
        return args
      } else {
        // selector arrays returned from `getCSSSelector` are treated as a
        // list of any selector that'll cause the styles to be applied, so
        // in order to combine them, we'll need to apply cartesian product.
        const selectorStrings = cartesian(cartesianInput).map(
          (selectorStrings) => {
            // TODO: figure out what to do if not all selectors have the same tail,
            // or if a selector is using an unsupported tail format
            const firstSelector = selectorStrings[0] as string
            const tailMatch = firstSelector.match(/\s+(~?\s*&?)\s*$/)
            const tail = tailMatch?.[1]
            return (
              selectorStrings
                .map((selector) =>
                  (selector as string).replace(/\s+~?\s*&?\s*$/g, ''),
                )
                .join('') +
              ' ' +
              tail
            )
          },
        )
        return themeRider.runtime`${selectorStrings.join(', ')} { ${args.map(
          (arg) => (typeof arg === 'function' ? arg(props) : arg),
        )} }`
      }
    }

    return cssFunction
  }

  return allSelectorsWrapper as SelectorFunction
}

function registerSelectorType<Context, Config>(
  keyFunction: SelectorKeyFunction<Context, Config>,
): SelectorType<Context, Config> {
  const typeIndex = selectorTypeRegister.length

  let nextSelectorKey = 1

  const createSelector = (config: Config): Selector<Config> & string => {
    const key = String(nextSelectorKey++)

    const serializedConfig = serializeSelectorTuple([typeIndex, key, config])

    const toString = () => serializedConfig

    const selectorWrapper = (initialArg: any, ...args: any[]): Function => {
      if (args.length === 0 && Array.isArray(initialArg)) {
        args = initialArg
      } else {
        args = [initialArg].concat(args)
      }

      const [selectionArgs, styleArgs] = partition(
        args,
        (arg) =>
          typeof arg === 'function' &&
          selectionsSymbol in arg &&
          arg[selectionsSymbol][0].selectors[0][selectorTypeSymbol] ===
            typeIndex,
      )

      const cssInterpolation = (props: any) => {
        const { selectorTypeContexts, runtime } = getThemeRider(props)
        const context = selectorTypeContexts[typeIndex] as Context | undefined
        const cssSelector = keyFunction(key, config, context)

        if (cssSelector === true) {
          return args
        } else if (cssSelector) {
          const selectorString = Array.isArray(cssSelector)
            ? cssSelector.join(',')
            : cssSelector

          return [
            styleArgs.length > 0 &&
              runtime`${selectorString} { ${args.map((arg) =>
                typeof arg === 'function' ? arg(props) : arg,
              )} }`,
          ]
            .concat(
              ...selectionArgs.map((interpolation) =>
                interpolation[selectionsSymbol].map(
                  ({ args, selectors }: SelectorSelection) =>
                    all(selector, ...selectors)(...args),
                ),
              ),
            )
            .filter(Boolean)
        }
      }

      return Object.assign(cssInterpolation, {
        [selectionsSymbol]: [
          styleArgs.length > 0 && {
            args: styleArgs,
            selectors: [selector],
          },
          ...([] as SelectorSelection[]).concat(
            ...selectionArgs.map((interpolation) =>
              interpolation[selectionsSymbol].map(
                ({ args, selectors }: SelectorSelection) => ({
                  args,
                  selectors: selectors.concat(selector),
                }),
              ),
            ),
          ),
        ].filter(Boolean),
      })
    }

    const selector: Selector<Config> = Object.assign(
      selectorWrapper as (interpolationContext: any) => any,
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
      const [, selectorKey, config] = tuple
      return {
        [selectorTypeSymbol]: typeIndex,
        key: selectorKey,
        config: config as Config,
      }
    }
  }

  const useSelectorContext = (
    themeContextArg?: React.Context<CSSTheme>,
  ): Context | undefined =>
    useThemeRider(themeContextArg)?.selectorTypeContexts?.[typeIndex] as
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
  const { selectorTypeContexts, runtime } = theme?.[themeRiderSymbol]!
  const context = selectorTypeContexts[typeIndex] as Context | undefined
  const updatedContext = updateContext(context)

  return updatedContext === null
    ? theme
    : {
        ...theme,
        [themeRiderSymbol]: {
          runtime: runtime,
          selectorTypeContexts: {
            ...selectorTypeContexts,
            [typeIndex]: updatedContext,
          },
        },
      }
}
