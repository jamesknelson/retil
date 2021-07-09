import { useContext } from 'react'
import { isPlainObject } from 'retil-support'

import { customSelectorPrefix, surfaceSelectorProbe } from './constants'
import { CSSInterpolation, CSSPropFunction, CSSSelector } from './cssTypes'
import { HighStyle } from './highStyle'

let nextSurfaceSelectorSerialNumber = 1

const surfaceSelectorSymbol = Symbol.for('retil:surfaceSelector')

export type SurfaceSelector = string & {
  readonly [surfaceSelectorSymbol]: true
  readonly serialNumber: number
  readonly toString: () => string
  readonly getCSSSelector: (baseSelector: string) => CSSSelector

  (
    strings: TemplateStringsArray,
    ...interpolations: Array<CSSInterpolation>
  ): CSSPropFunction

  (...args: Array<CSSInterpolation>): CSSPropFunction
}

export type SurfaceSelectorTuple = [
  type: 'ss',
  serialNumber: number,
  cssSelectorWithProbe: CSSSelector,
]

export function isMediaQuery(x: any): x is SurfaceSelector {
  return typeof x === 'function' && x[surfaceSelectorSymbol] === true
}

export type SurfaceSelectorConfig =
  | CSSSelector
  | ((baseSelector: string) => CSSSelector)

export function createSurfaceSelector(config: SurfaceSelectorConfig) {
  const serialNumber = nextSurfaceSelectorSerialNumber++
  const getCSSSelector =
    typeof config === 'function'
      ? config
      : typeof config === 'string' && config[0] === ':'
      ? (baseSelector: string) => baseSelector + config
      : () => config
  const cssSelectorWithProbe = getCSSSelector(surfaceSelectorProbe)
  const tuple: SurfaceSelectorTuple = ['ss', serialNumber, cssSelectorWithProbe]
  const toString = () => customSelectorPrefix + JSON.stringify(tuple)

  const selector: SurfaceSelector = Object.assign(
    (x: HighStyle | TemplateStringsArray): CSSPropFunction => {
      if (Array.isArray(x)) {
        // it's being used as a template... I think
      } else if (isPlainObject(x)) {
        // Treat it as a high-style object
      } else {
        throw new Error('Unknown type passed to surface selector function')
      }
    },
    {
      [surfaceSelectorSymbol]: true as const,
      getCSSSelector,
      serialNumber,
      toString,
    },
  ) as SurfaceSelector

  return selector
}

export interface ConnectSurfaceProps {
  mergeProps
  overrideSelectors?: readonly [SurfaceSelector, SurfaceSelectorConfig]
}

export function ConnectSurface(props: ConnectSurfaceProps) {
  const { mergeProps, overrideSelectors } = props
  const { themeContext } = useContext()
  const theme = useContext(themeContext)
  const parentRx = theme[rxSymbol]
  const surfaceDepth = (parentRx.surfaceDepth || 0) + 1
  const rx = {
    ...parentRx,
    // set this to true
    surfaceBoundary: true,
    // set the surface depth so we can compute the default base selector
    surfaceDepth,
    surfaceOverrides: {
      ...parentRx.surfaceOverrides,
      // add selectors for overrides
      // [inFocusedSurface.id]: [":not(.rx-1-1-off):hover, .rx-1-1-on"],
      // [inHoveredSurface.id]: [":not(.rx-1-2-off):hover, .rx-1-2-on"]
    },
  }

  const renderProps = {
    children: mergeProps.children && (
      <themeContext.Provider
        value={{
          ...theme,
          [rxSymbol]: {
            ...rx,
            // indicate that the '&' needs to come after the selector instead of
            // before it
            surfaceBoundary: false,
          },
        }}>
        {mergeProps.children}
      </themeContext.Provider>
    ),

    // TODO: compute classes for specific overrides
    className: `rx-${surfaceDepth}`, // TODO rx-${surfaceDepth}-1 rx-${surfaceDepth}-2 rx-${surfaceDepth}-2-on`
  }

  return (
    <themeContext.Provider
      value={{
        ...theme,
        [rxSymbol]: rx,
      }}>
      {render(renderProps)}
    </themeContext.Provider>
  )
}
