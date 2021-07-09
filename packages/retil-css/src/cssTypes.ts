import * as CSS from 'csstype'

import { SurfaceSelector } from './surfaceSelector'
import { ThemeRx, rxSymbol } from './theme'

export interface CSSRuntimeFunction {
  (template: TemplateStringsArray, ...args: Array<CSSInterpolation>): any
  (...args: Array<CSSInterpolation>): any
}

export type BaseExtensibleObject = {
  [key: string]: any
}

export type ExecutionContext = BaseExtensibleObject & {
  theme?: { [rxSymbol]?: ThemeRx }
} & {
  [rxSymbol]?: ThemeRx
}

export type CSSPropFunction<Props extends ExecutionContext = ExecutionContext> =
  (themeOrProps: Props) => CSSInterpolation

// Equivalent to the CSSObject type expected by styled-components and emotion.
export type CSSProperties = CSS.Properties<string | number>
export type CSSPropertiesWithMultiValues = {
  [K in keyof CSSProperties]:
    | CSSProperties[K]
    | Array<Extract<CSSProperties[K], string>>
}

export type CSSPseudos = { [K in CSS.Pseudos]?: CSSObject }
export interface ArrayCSSInterpolation extends Array<CSSInterpolation> {}

export type InterpolationPrimitive =
  | null
  | undefined
  | boolean
  | number
  | string
  // TODO:
  // | Keyframes
  // | ComponentSelector
  | CSSObject
  | CSSPropFunction
  | SurfaceSelector

export interface CSSObject
  extends CSSPropertiesWithMultiValues,
    CSSPseudos,
    CSSOthersObject {}

export type CSSInterpolation = InterpolationPrimitive | ArrayCSSInterpolation

export interface CSSOthersObject {
  [propertiesName: string]: CSSInterpolation
}

// When an array of CSS selector strings is provided, any of those selectors
// will be used to match the state. When `true`, the applicable styles will
// always be used. When `false`, they never will be.
export type CSSSelector = string[] | string | boolean
