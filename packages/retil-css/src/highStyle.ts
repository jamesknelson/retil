import { emptyObject, identity, isPlainObject } from 'retil-support'

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
export type HighStyle<TInterpolationContext = unknown> = {
  [K in keyof CSSObject]?: HighStyleValue<CSSObject[K], TInterpolationContext>
}

export type HighStyleInput<TValue, TInterpolationContext = unknown> =
  | ((
      interpolationContext: TInterpolationContext,
    ) => HighStyleValue<TValue, TInterpolationContext>)
  | HighStyleScopedValues<TValue, TInterpolationContext>
  | TValue

// Allows for mapping a high style value. This is structured as a tuple so:
// 1. The map doesn't need to be run unless the value is required
// 2. It may be possible to support mapping of multiple inputs at some point.
export type HighStyleValue<TValue, TInterpolationContext = unknown> =
  | readonly [
      HighStyleInput<unknown, TInterpolationContext>,
      (arg: unknown) => TValue,
    ]
  | HighStyleInput<TValue, TInterpolationContext>

export type HighStyleScopedValues<TValue, TInterpolationContext = unknown> = {
  [selector: string]: HighStyleValue<TValue, TInterpolationContext>
}

export type HighStyleInterpolation<
  TTheme extends CSSTheme,
  TInterpolationContext extends CSSInterpolationContext<TTheme>,
> = <TStyles>(
  interpolationContext: TInterpolationContext & CSSInterpolationContext<TTheme>,
) => TStyles

export function mapHighStyleValue<
  TFromValue,
  TToValue,
  TInterpolationContext = unknown,
>(
  value: HighStyleValue<TFromValue, TInterpolationContext>,
  mapCallback: (value: TFromValue) => TToValue,
): HighStyleValue<TToValue, TInterpolationContext> {
  return !Array.isArray(value)
    ? ([value, mapCallback] as HighStyleValue<TToValue, TInterpolationContext>)
    : ([
        value[0],
        (input: TFromValue) => mapCallback(value[1](input)),
      ] as HighStyleValue<TToValue, TInterpolationContext>)
}

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
  const [input, map] = Array.isArray(highValue)
    ? highValue
    : [highValue, identity]

  if (typeof input === 'number' || typeof input === 'string') {
    output[property] = map(input)
  } else if (typeof input === 'function') {
    mutableCompileHighStyle(
      context,
      themeRider,
      output,
      property,
      map(input(context)),
    )
  } else if (isPlainObject(input)) {
    // Ensure the default selector is always first, so that it doesn't override
    // other selectors.
    const selectorKeys = Object.keys(input)
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
          map(input[selectorString]),
        )
      }
    }
  }
}
