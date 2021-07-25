import * as CSS from 'csstype'

import type { themeRiderSymbol } from './constants'

export type BaseExtensibleObject = {
  [key: string]: any
}

export interface CSSThemeRider {
  runtime: CSSRuntime
  selectorTypeContexts: unknown[]
}

export type CSSInterpolationContext<Theme extends CSSTheme = CSSTheme> =
  | Theme
  | (BaseExtensibleObject & {
      theme?: Theme
    })

export type CSSTheme = BaseExtensibleObject & {
  [themeRiderSymbol]?: CSSThemeRider
}

export interface CSSRuntime {
  (template: TemplateStringsArray, ...args: Array<any>): any
  (...args: Array<any>): any
}

// Equivalent to the CSSObject type expected by styled-components and emotion.
export type CSSProperties = CSS.Properties<string | number>
export type CSSPropertiesWithMultiValues = {
  [K in keyof CSSProperties]:
    | CSSProperties[K]
    | Array<Extract<CSSProperties[K], string>>
}

export type CSSPseudos = { [K in CSS.Pseudos]?: CSSObject }

export interface CSSObject
  extends CSSPropertiesWithMultiValues,
    CSSPseudos,
    CSSOthersObject {}

export interface CSSOthersObject {
  [propertiesName: string]: any
}

// When an array of CSS selector strings is provided, any of those selectors
// will be used to match the state. When `true`, the applicable styles will
// always be used. When `false`, they never will be.
export type CSSSelector = string | boolean
