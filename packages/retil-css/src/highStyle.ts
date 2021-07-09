import { isPlainObject } from 'retil-support'

import { surfaceClassPrefix, surfaceSelectorProbe } from './constants'
import {
  CSSObject,
  CSSPropFunction,
  CSSSelector,
  ExecutionContext,
} from './cssTypes'
import { MediaQueryTuple } from './mediaQuery'
import { stringifySelectorArray } from './stringifySelectorArray'
import { SurfaceSelectorTuple } from './surfaceSelector'
import { ThemeRx, rxSymbol } from './theme'

/**
 * An extended style object, which allows you to specify each property as
 * one of:
 *
 * - a value
 * - a function mapping your theme to a value
 * - an object mapping selectors or media queries to nested High Style objects
 */
export type HighStyle<Props extends ExecutionContext = ExecutionContext> = {
  [K in keyof CSSObject]?: HighStyleValue<CSSObject[K], Props>
}

export type HighStyleValue<
  Value,
  Props extends ExecutionContext = ExecutionContext,
> =
  | ((props: Props) => HighStyleValue<Value, Props>)
  | HighStyleScopedValues<Value, Props>
  | Value

export type HighStyleScopedValues<
  Value,
  Props extends ExecutionContext = ExecutionContext,
> = {
  [selector: string]: HighStyleValue<Value, Props>
}

export type HighStyleSelectorTuple = MediaQueryTuple | SurfaceSelectorTuple

export function highStyle<Props extends ExecutionContext = ExecutionContext>(
  input: HighStyle<Props>,
): CSSPropFunction<Props> {
  const cssPropFunction = (props: Props): CSSObject => {
    const theme =
      'theme' in props
        ? (props as { theme: { [rxSymbol]: ThemeRx } })['theme']
        : (props as { [rxSymbol]: ThemeRx })
    const rx = theme[rxSymbol]

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
  Props extends ExecutionContext = ExecutionContext,
>(
  props: Props,
  rx: ThemeRx,
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

    const { media, surfaceBoundary, surfaceDepth, surfaceOverrides } = rx

    for (const selectorName of selectorKeys) {
      let selectorOutput: CSSObject | undefined
      let selector: CSSSelector
      if (selectorName === 'default') {
        // Output this selector's styles to the top-level
        selector = true
      } else if (selectorName.slice(0, 4) !== ':rx-') {
        selector = selectorName
      } else {
        const [type, serialNumber, def] = JSON.parse(
          selectorName.slice(4),
        ) as HighStyleSelectorTuple

        if (type === 'mq') {
          selector = media[serialNumber] ?? def
        } else if (type === 'ss') {
          const baseSelector = surfaceClassPrefix + surfaceDepth
          const override = surfaceOverrides[serialNumber]

          selector = override
            ? override(baseSelector)
            : typeof def === 'boolean'
            ? def
            : (Array.isArray(def) ? def : [def]).map((selectorString) =>
                selectorString.replace(surfaceSelectorProbe, baseSelector),
              )
        } else {
          throw new Error('Unknown selector type')
        }
      }

      const selectors = typeof selector === 'string' ? [selector] : selector
      if (selectors === true) {
        selectorOutput = output
      } else if (selectors) {
        selectorOutput = (output[
          stringifySelectorArray(selectors, surfaceBoundary)
        ] || {}) as CSSObject | undefined
        output[selectorName] = selectorOutput
      }

      if (selectorOutput) {
        mutableCompileHighStyle(
          props,
          rx,
          selectorOutput,
          property,
          highValue[selectorName],
        )
      }
    }
  }
}
