import { isPlainObject } from 'packages/retil-support/src/isPlainObject'
import { HighStyle, CSSFunction, CSSInterpolation } from './styleTypes'

// we're going to need a custom `css` function to handle the function
// interpolations, and this custom `css` function will look for the upstream
// `css` function the theme object.
//
// the function will need to inject a `theme` into css props, or pass through
// `props` when used in styled components
//
// yes it's a little weird if you know how the sausage is made, but I think
// it'll make for a reasonably intuitive API

let nextSerialNumber = 1

export interface SurfaceSelector {
  // When passed an object
  (obj: HighStyle): CSSFunction

  // When called as a template tag
  (
    strings: TemplateStringsArray,
    ...interpolations: Array<CSSInterpolation>
  ): CSSFunction

  // When bare-interpolated into another template (note, this approach does not
  // allow for composing multiple surface selectors – only one can be used at a
  // time).
  <Props>(props: Props): CSSInterpolation

  // This returns an id which can be used to
  toString(): string
}

export type SurfaceSelectorConfig = (baseSelector: string) => string

export function createSurfaceSelector(config: SurfaceSelectorConfig) {
  const serialNumber = nextSerialNumber++

  const selector: SurfaceSelector = <Props>(
    x: HighStyle | TemplateStringsArray | Props,
  ): CSSFunction & CSSInterpolation => {
    if (Array.isArray(x)) {
      // it's being used as a template... I think
    } else if (isPlainObject(x)) {
      // Treat it as a high-style object
    } else {
      throw new Error('Unknown type passed to surface selector function')
    }
  }

  selector.toString = () => `rc-${serialNumber}`

  return selector
}
