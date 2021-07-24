import { isPlainObject } from 'retil-support'

import {
  CSSObject,
  CSSInterpolationFunction,
  CSSInterpolationContext,
} from './cssTypes'
import {
  RetilCSSInterpolationContext,
  retilCSSInterpolationContextSymbol,
} from './context'
import { getCSSSelector } from './customSelector'

/**
 * An extended style object, which allows you to specify each property as
 * one of:
 *
 * - a value
 * - a function mapping your theme to a value
 * - an object mapping selectors or media queries to nested High Style objects
 */
export type HighStyle<
  Props extends CSSInterpolationContext = CSSInterpolationContext,
> = {
  [K in keyof CSSObject]?: HighStyleValue<CSSObject[K], Props>
}

export type HighStyleValue<
  Value,
  Props extends CSSInterpolationContext = CSSInterpolationContext,
> =
  | ((props: Props) => HighStyleValue<Value, Props>)
  | HighStyleScopedValues<Value, Props>
  | Value

export type HighStyleScopedValues<
  Value,
  Props extends CSSInterpolationContext = CSSInterpolationContext,
> = {
  [selector: string]: HighStyleValue<Value, Props>
}

export function highStyle<
  Props extends CSSInterpolationContext = CSSInterpolationContext,
>(input: HighStyle<Props>): CSSInterpolationFunction<Props> {
  const cssPropFunction = (props: Props): CSSObject => {
    const theme =
      'theme' in props
        ? (
            props as {
              theme: {
                [retilCSSInterpolationContextSymbol]: RetilCSSInterpolationContext
              }
            }
          )['theme']
        : (props as {
            [retilCSSInterpolationContextSymbol]: RetilCSSInterpolationContext
          })
    const rx = theme[retilCSSInterpolationContextSymbol]

    const styleProperties = Object.keys(input)
    const output: CSSObject = {}
    for (const styleProperty of styleProperties) {
      mutableCompileHighStyle(
        props,
        rx,
        output,
        styleProperty,
        input[styleProperty],
      )
    }

    return output
  }

  return cssPropFunction
}

function mutableCompileHighStyle<
  Props extends CSSInterpolationContext = CSSInterpolationContext,
>(
  props: Props,
  rx: RetilCSSInterpolationContext,
  output: CSSObject,
  property: string,
  highValue: HighStyleValue<any, Props>,
): void {
  if (typeof highValue === 'number' || typeof highValue === 'string') {
    output[property] = highValue
  } else if (typeof highValue === 'function') {
    mutableCompileHighStyle(props, rx, output, property, highValue(props))
  } else if (isPlainObject(highValue)) {
    // Ensure the default selector is always first, so that it doesn't override
    // other selectors.
    const selectorKeys = Object.keys(highValue)
    const defaultIndex = selectorKeys.indexOf('default')
    if (defaultIndex > 0) {
      selectorKeys.splice(defaultIndex, 1)
      selectorKeys.unshift('default')
    }

    for (const maybeCustomSelectorString of selectorKeys) {
      const selector = getCSSSelector(maybeCustomSelectorString, rx)

      let selectorOutput: CSSObject | undefined
      if (selector === true || selector === 'default') {
        selectorOutput = output
      } else if (selector) {
        selectorOutput = (output[selector] || {}) as CSSObject | undefined
        output[selector] = selectorOutput
      }

      if (selectorOutput) {
        mutableCompileHighStyle(
          props,
          rx,
          selectorOutput,
          property,
          highValue[maybeCustomSelectorString],
        )
      }
    }
  }
}
