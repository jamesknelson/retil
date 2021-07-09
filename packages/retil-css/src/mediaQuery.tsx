import React, { useContext, useMemo } from 'react'

import { customSelectorPrefix } from './constants'
import {
  CSSInterpolation,
  CSSPropFunction,
  CSSTheme,
  ExecutionContext,
} from './cssTypes'
import { defaultRuntime } from './defaultRuntime'
import { HighStyle } from './highStyle'
import { ThemeRx, rxSymbol } from './theme'

let nextMediaQuerySerialNumber = 1

const mediaQuerySymbol = Symbol.for('retil:mediaQuery')

export type MediaQuery = string & {
  readonly [mediaQuerySymbol]: true
  readonly serialNumber: number
  readonly toString: () => string
  readonly defaultValue: string

  (
    strings: TemplateStringsArray,
    ...interpolations: Array<CSSInterpolation>
  ): CSSPropFunction

  (...args: Array<CSSInterpolation>): CSSPropFunction
}

export type MediaQueryTuple = [
  type: 'mq',
  serialNumber: number,
  defaultValue: string,
]

export function isMediaQuery(x: any): x is MediaQuery {
  return typeof x === 'function' && x[mediaQuerySymbol] === true
}

export function createMediaQuery(defaultValue: string) {
  const serialNumber = nextMediaQuerySerialNumber++
  const tuple: MediaQueryTuple = ['mq', serialNumber, defaultValue]
  const toString = () => customSelectorPrefix + JSON.stringify(tuple)

  const mediaQuery: MediaQuery = Object.assign(
    (...args: CSSInterpolation[]): CSSPropFunction => {
      if (args.length === 1 && Array.isArray(args[0])) {
        args = args[0]
      }

      const cssFunction: CSSPropFunction = (props) => {
        const mappedArgs = args.map((arg) =>
          typeof arg === 'function' ? arg(props) : arg,
        )

        const theme =
          'theme' in props
            ? (props as { theme: { [rxSymbol]: ThemeRx } })['theme']
            : (props as { [rxSymbol]: ThemeRx })

        const { media, runtime } = theme[rxSymbol]
        const selector = media[serialNumber] ?? defaultValue
        const originalCSS = runtime.apply(null, mappedArgs)

        if (selector === true) {
          return originalCSS
        } else if (selector) {
          return runtime(runtime`${selector} {`, originalCSS, runtime`}`)
        }
      }

      return cssFunction
    },
    {
      [mediaQuerySymbol]: true as const,
      serialNumber,
      toString,
      defaultValue,
    },
  ) as MediaQuery

  return mediaQuery
}

export interface ProvideMediaQueriesProps {
  children: React.ReactNode
  override: {
    [key: string]: string | boolean
  }
  themeContext?: React.Context<CSSTheme>
}

export function ProvideMediaQueries(props: ProvideMediaQueriesProps) {
  const themeContext = props.themeContext ?? defaultRuntime.themeContext

  const theme = useContext(themeContext)
  const extendedTheme = useMemo(
    () => ({
      // TODO: update the theme
      ...theme,
    }),
    [theme],
  )

  return (
    <themeContext.Provider value={extendedTheme}>
      {props.children}
    </themeContext.Provider>
  )
}
