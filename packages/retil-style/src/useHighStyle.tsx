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
    Theme,
    HighSelector,
    CSSObject[Prop]
  >
}

export type HighStyleValue<Theme, HighSelector extends string, Value> =
  | ((theme: Theme) => HighStyleValue<Theme, HighSelector, Value>)
  | HighStyleSelections<Theme, HighSelector, Value>
  | Value

export type HighStyleSelections<Theme, HighSelector extends string, Value> = {
  [Selector in HighSelector | 'default']: HighStyleValue<
    Theme,
    HighSelector,
    Value
  >
} & {
  [selector: string]: HighStyleValue<Theme, HighSelector, Value>
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

export function useHighStyle<Theme, HighSelector extends string>(
  highStyle: HighStyle<Theme, HighSelector>,
): CSSFunction<Theme> {
  const downSelect = useDownSelect()

  const styleFunction = (themeOrProps: Theme | { theme: Theme }) => {
    // Emotion passes in a theme directly, while styled-components passes it
    // on a proprety of the argument object.
    const theme = 'theme' in themeOrProps ? themeOrProps['theme'] : themeOrProps
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

  return styleFunction
}

function mutableCompileStyle<Theme, HighSelector extends string>(
  theme: Theme,
  downSelect: DownSelect<HighSelector>,
  output: CSSObject,
  property: string,
  highValue: HighStyleValue<Theme, HighSelector, any>,
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
