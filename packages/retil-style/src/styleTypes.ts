import * as CSS from 'csstype'

export type CSSFunction = (
  template: TemplateStringsArray,
  ...args: Array<any>
) => any

export type CSSPropFunction<Theme = any> = (
  themeOrProps: Theme | { theme: Theme },
) => CSSObject

// When an array of CSS selector strings is provided, any of those selectors
// will be used to match the state. When `true`, the applicable styles will
// always be used. When `false`, they never will be.
export type CSSSelector = string[] | string | boolean

// Equivalent to the CSSObject type expected by styled-components and emotion.
export type CSSProperties = CSS.Properties<string | number>
export type CSSPseudos = { [K in CSS.Pseudos]?: CSSObject }
export interface CSSObject extends CSSProperties, CSSPseudos {
  [key: string]: CSSObject | string | number | undefined
}

/**
 * An extended style object, which allows you to specify each property as
 * one of:
 *
 * - a value
 * - a function mapping your theme to a value
 * - an object mapping selectors to nested xstyle objects
 */
export type HighStyle<Theme = any, HighSelector extends string = string> = {
  [Prop in keyof CSSObject]?: HighStyleValue<
    CSSObject[Prop],
    Theme,
    HighSelector
  >
}

export type HighStyleValue<
  Value,
  Theme = any,
  HighSelector extends string = string,
> =
  | ((theme: Theme) => HighStyleValue<Value, Theme, HighSelector>)
  | HighStyleSelections<Value, Theme, HighSelector>
  | Value

export type HighStyleSelections<
  Value,
  Theme = any,
  HighSelector extends string = string,
> = {
  [Selector in HighSelector | 'default']: HighStyleValue<
    Value,
    Theme,
    HighSelector
  >
} & {
  [selector: string]: HighStyleValue<Value, Theme, HighSelector>
}

/**
 * Accepts the name of a high-style selector, e.g. "hover" or "widescreen", and
 * returns a css selector which can be used to limit styles to that interaction/
 * media state. Alternatively, it may return a boolean indicating that the
 * styles should always/never apply.
 *
 * If `undefined` is returned, then any value provided by the parent selector
 * will be used. If there is no parent selector, then the selector will be used
 * as-is.
 */
export type DownSelect<HighSelector extends string> = (
  highSelector: HighSelector,
) => CSSSelector | undefined
