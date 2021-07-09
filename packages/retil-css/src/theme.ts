import { CSSRuntimeFunction } from './cssTypes'

export const rxSymbol = Symbol.for('retil-css')

export type ThemeRx = {
  // The adapter providers for Styled Components and Emotion will need to set
  // this.
  runtime: CSSRuntimeFunction

  media: {
    [mediaQueryKey: string]: boolean | string
  }
  surfaceBoundary: boolean
  surfaceDepth: number
  surfaceOverrides: {
    [surfaceSelectorKey: string]: (
      baseSelector: string,
    ) => string[] | string | boolean
  }
}
