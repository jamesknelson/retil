import * as CSS from 'csstype'
import { isPlainObject } from 'retil-support'

import { DownSelect, useDownSelect } from './downSelect'

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
  HighSelector extends string = string
> =
  | ((theme: Theme) => HighStyleValue<Value, Theme, HighSelector>)
  | HighStyleSelections<Value, Theme, HighSelector>
  | Value

export type HighStyleSelections<
  Value,
  Theme = any,
  HighSelector extends string = string
> = {
  [Selector in HighSelector | 'default']: HighStyleValue<
    Value,
    Theme,
    HighSelector
  >
} & {
  [selector: string]: HighStyleValue<Value, Theme, HighSelector>
}

// Equivalent to the CSSObject type expected by styled-components and emotion.
export type CSSProperties = CSS.Properties<string | number>
export type CSSPseudos = { [K in CSS.Pseudos]?: CSSObject }
export interface CSSObject extends CSSProperties, CSSPseudos {
  [key: string]: CSSObject | string | number | undefined
}
export type CSSFunction<Theme = any> = (
  themeOrProps: Theme | { theme: Theme },
) => CSSObject

// TODO: instead of taking highStyle, take an optional downSelect, and return
// a function that takes style and returns style
export function useHighStyle<Theme, HighSelector extends string>(
  overrideDownSelect?: DownSelect<HighSelector>,
): (highStyle: HighStyle<Theme, HighSelector>) => CSSFunction<Theme> {
  const downSelect = useDownSelect(overrideDownSelect)

  return (highStyle) => {
    const cssFunction = (themeOrProps: Theme | { theme: Theme }) => {
      // Emotion passes in a theme directly, while styled-components passes it
      // on a proprety of the argument object.
      const theme =
        'theme' in themeOrProps ? themeOrProps['theme'] : themeOrProps
      const props = Object.keys(highStyle)
      const output: CSSObject = {}
      for (const propName of props) {
        mutableCompileStyle(
          theme,
          downSelect,
          output,
          propName,
          highStyle[propName],
        )
      }

      return output
    }
    return cssFunction
  }
}

function mutableCompileStyle<Theme, HighSelector extends string>(
  theme: Theme,
  downSelect: DownSelect<HighSelector>,
  output: CSSObject,
  property: string,
  highValue: HighStyleValue<any, Theme, HighSelector>,
): void {
  if (typeof highValue === 'number' || typeof highValue === 'string') {
    output[property] = highValue
  } else if (typeof highValue === 'function') {
    mutableCompileStyle(theme, downSelect, output, property, highValue(theme))
  } else if (isPlainObject(highValue)) {
    const selectorNames = Object.keys(highValue) as HighSelector[]
    for (const selectorName of selectorNames) {
      const selector =
        selectorName === 'default' ? true : downSelect(selectorName)

      let selectorOutput: CSSObject | undefined
      if (selector === true) {
        // Output this selector's styles to the top-level
        selectorOutput = output
      } else if (selector) {
        // Create another object to output this selector's styles to
        const selectorString = Array.isArray(selector)
          ? selector.join(', ')
          : selector
        selectorOutput = (output[selectorString] || {}) as CSSObject | undefined
        output[selectorString] = selectorOutput
      }

      if (selectorOutput) {
        mutableCompileStyle(
          theme,
          downSelect,
          selectorOutput,
          property,
          highValue[selectorName],
        )
      }
    }
  }
}
