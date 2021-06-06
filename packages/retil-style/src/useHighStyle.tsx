import { useCallback } from 'react'
import { isPlainObject } from 'retil-support'

import {
  CSSObject,
  CSSPropFunction,
  DownSelect,
  HighStyle,
  HighStyleValue,
} from './styleTypes'

export function useHighStyle<Theme, HighSelector extends string>(
  downSelect: DownSelect<HighSelector>,
): (highStyle: HighStyle<Theme, HighSelector>) => CSSPropFunction<Theme> {
  return useCallback(
    (highStyle) => {
      const cssPropFunction = (themeOrProps: Theme | { theme: Theme }) => {
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
      return cssPropFunction
    },
    [downSelect],
  )
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
    // Ensure the default selector is always first, so that it doesn't override
    // other selectors.
    const { default: _, ...nonDefault } = highValue
    const selectorNames = (
      'default' in highValue ? ['default' as HighSelector] : []
    ).concat(Object.keys(nonDefault) as HighSelector[])

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
