import { emptyObject, isPlainObject } from 'retil-support'

import { getThemeRider } from './context'
import { getCSSSelector } from './selector'
import {
  CSSInterpolationContext,
  CSSObject,
  CSSTheme,
  CSSThemeRider,
} from './types'

/**
 * An extended style object, which allows you to specify each property as
 * one of:
 *
 * - a value
 * - a function mapping your theme to a value
 * - an object mapping selectors or media queries to nested High Style objects
 */
export type HighStyle<InterpolationContext = unknown> = {
  [K in keyof CSSObject]?: HighStyleValue<CSSObject[K], InterpolationContext>
}

export type HighStyleValue<Value, InterpolationContext = unknown> =
  | ((
      interpolationContext: InterpolationContext,
    ) => HighStyleValue<Value, InterpolationContext>)
  | HighStyleScopedValues<Value, InterpolationContext>
  | Value

export type HighStyleScopedValues<Value, InterpolationContext = unknown> = {
  [selector: string]: HighStyleValue<Value, InterpolationContext>
}

export type HighStyleInterpolation<
  TTheme extends CSSTheme,
  TInterpolationContext extends CSSInterpolationContext<TTheme>,
> = <TStyles>(
  interpolationContext: TInterpolationContext & CSSInterpolationContext<TTheme>,
) => TStyles

export function highStyle<
  TTheme extends CSSTheme,
  TInterpolationContext extends CSSInterpolationContext<TTheme> = {},
>(
  highStyle: HighStyle<TInterpolationContext> = emptyObject,
): HighStyleInterpolation<TTheme, TInterpolationContext> {
  const interpolation = <TStyles>(context: TInterpolationContext): TStyles => {
    const themeRider = getThemeRider(context)
    const styleProperties = Object.keys(highStyle)
    const output: CSSObject = {}
    for (const styleProperty of styleProperties) {
      mutableCompileHighStyle(
        context,
        themeRider,
        output,
        styleProperty,
        highStyle[styleProperty],
      )
    }

    return output as TStyles
  }

  return interpolation
}

function mutableCompileHighStyle<InterpolationContext>(
  context: InterpolationContext,
  themeRider: CSSThemeRider,
  output: CSSObject,
  property: string,
  highValue: HighStyleValue<any, InterpolationContext>,
): void {
  if (typeof highValue === 'number' || typeof highValue === 'string') {
    output[property] = highValue
  } else if (typeof highValue === 'function') {
    mutableCompileHighStyle(
      context,
      themeRider,
      output,
      property,
      highValue(context),
    )
  } else if (isPlainObject(highValue)) {
    // Ensure the default selector is always first, so that it doesn't override
    // other selectors.
    const selectorKeys = Object.keys(highValue)
    const defaultIndex = selectorKeys.indexOf('default')
    if (defaultIndex > 0) {
      selectorKeys.splice(defaultIndex, 1)
      selectorKeys.unshift('default')
    }

    for (const selectorString of selectorKeys) {
      const selector = getCSSSelector(selectorString, themeRider)
      const selectorStringOrBoolean = Array.isArray(selector)
        ? selector.join(',')
        : selector

      let selectorOutput: CSSObject | undefined
      if (
        selectorStringOrBoolean === true ||
        selectorStringOrBoolean === 'default'
      ) {
        selectorOutput = output
      } else if (selectorStringOrBoolean) {
        selectorOutput = (output[selectorStringOrBoolean] || {}) as
          | CSSObject
          | undefined
        output[selectorStringOrBoolean] = selectorOutput
      }

      if (selectorOutput) {
        mutableCompileHighStyle(
          context,
          themeRider,
          selectorOutput,
          property,
          highValue[selectorString],
        )
      }
    }
  }
}
