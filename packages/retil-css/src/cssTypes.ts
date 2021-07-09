import * as CSS from 'csstype'
import type { Context } from 'react'

import { SurfaceSelector } from './surfaceSelector'
import { ThemeRx, rxSymbol } from './theme'

export type BaseExtensibleObject = {
  [key: string]: any
}

export type ExecutionContext<Theme extends CSSTheme = CSSTheme> =
  BaseExtensibleObject & {
    theme?: Theme
  } & Theme

export type CSSTheme = BaseExtensibleObject & {
  [rxSymbol]?: ThemeRx
}

export interface CSSRuntime<Theme extends CSSTheme = CSSTheme> {
  themeContext: Context<Theme>
  css: CSSRuntimeFunction<ExecutionContext<Theme>>
}

export interface CSSRuntimeFunction<
  Props extends ExecutionContext = ExecutionContext,
> {
  (template: TemplateStringsArray, ...args: Array<CSSInterpolation<Props>>): any
  (...args: Array<CSSInterpolation<Props>>): any
}

export type CSSPropFunction<Props extends ExecutionContext = ExecutionContext> =
  (themeOrProps: Props) => CSSInterpolation<Props>

// Equivalent to the CSSObject type expected by styled-components and emotion.
export type CSSProperties = CSS.Properties<string | number>
export type CSSPropertiesWithMultiValues = {
  [K in keyof CSSProperties]:
    | CSSProperties[K]
    | Array<Extract<CSSProperties[K], string>>
}

export type CSSPseudos = { [K in CSS.Pseudos]?: CSSObject }
export interface ArrayCSSInterpolation<
  Props extends ExecutionContext = ExecutionContext,
> extends Array<CSSInterpolation<Props>> {}

export type InterpolationPrimitive<
  Props extends ExecutionContext = ExecutionContext,
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
  | CSSPropFunction<Props>
  | SurfaceSelector

export interface CSSObject
  extends CSSPropertiesWithMultiValues,
    CSSPseudos,
    CSSOthersObject {}

export type CSSInterpolation<
  Props extends ExecutionContext = ExecutionContext,
> = InterpolationPrimitive<Props> | ArrayCSSInterpolation<Props>

export interface CSSOthersObject {
  [propertiesName: string]: CSSInterpolation
}

// When an array of CSS selector strings is provided, any of those selectors
// will be used to match the state. When `true`, the applicable styles will
// always be used. When `false`, they never will be.
export type CSSSelector = string[] | string | boolean
