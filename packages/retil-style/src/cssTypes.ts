import * as CSS from 'csstype'

import {
  RetilCSSInterpolationContext,
  retilCSSInterpolationContextSymbol,
} from './context'
import { CustomSelector } from './customSelector'

export type BaseExtensibleObject = {
  [key: string]: any
}

export type CSSInterpolationContext<Theme extends CSSTheme = CSSTheme> =
  BaseExtensibleObject & {
    theme?: Theme
  } & Theme

export type CSSTheme = BaseExtensibleObject & {
  [retilCSSInterpolationContextSymbol]?: RetilCSSInterpolationContext
}

export interface CSSRuntimeFunction<
  Context extends CSSInterpolationContext = any,
> {
  (
    template: TemplateStringsArray,
    ...args: Array<CSSInterpolation<Context>>
  ): any
  (...args: Array<CSSInterpolation<Context>>): any
}

export type CSSInterpolationFunction<
  Context extends CSSInterpolationContext = CSSInterpolationContext,
> = (themeOrProps: Context) => CSSInterpolation<Context>

// Equivalent to the CSSObject type expected by styled-components and emotion.
export type CSSProperties = CSS.Properties<string | number>
export type CSSPropertiesWithMultiValues = {
  [K in keyof CSSProperties]:
    | CSSProperties[K]
    | Array<Extract<CSSProperties[K], string>>
}

export type CSSPseudos = { [K in CSS.Pseudos]?: CSSObject }
export interface ArrayCSSInterpolation<
  Props extends CSSInterpolationContext = CSSInterpolationContext,
> extends Array<CSSInterpolation<Props>> {}

export type InterpolationPrimitive<
  Props extends CSSInterpolationContext = CSSInterpolationContext,
> =
  | null
  | undefined
  | boolean
  | number
  | string
  // TODO:
  // | Keyframes
  // | ComponentSelector
  | CSSObject
  | CSSInterpolationFunction<Props>
  | CustomSelector<any>

export interface CSSObject
  extends CSSPropertiesWithMultiValues,
    CSSPseudos,
    CSSOthersObject {}

export type CSSInterpolation<
  Props extends CSSInterpolationContext = CSSInterpolationContext,
> = InterpolationPrimitive<Props> | ArrayCSSInterpolation<Props>

export interface CSSOthersObject {
  [propertiesName: string]: CSSInterpolation
}

// When an array of CSS selector strings is provided, any of those selectors
// will be used to match the state. When `true`, the applicable styles will
// always be used. When `false`, they never will be.
export type CSSSelector = string | boolean
