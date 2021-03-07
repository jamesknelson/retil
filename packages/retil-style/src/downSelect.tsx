import React, {
  ReactNode,
  ReactElement,
  createContext,
  useCallback,
  useContext,
} from 'react'

// When an array of CSS selector strings is provided, any of those selectors
// will be used to match the state. When `true`, the applicable styles will
// always be used. When `false`, they never will be.
export type CSSSelector = string[] | string | boolean

/**
 * Accepts the name of a high-style selector, e.g. "hover" or "widescreen", and
 * returns a css selector which can be used to limit styles to that interaction/
 * media state. Alternatively, it may return a boolean indicating that the
 * styles should always/never apply.
 *
 * If `undefined` is returned, then any value provided by the parent selector
 * will be used. If there is no parent selector, then by default, the styles
 * will not be applied.
 */
export type DownSelect<HighSelector extends string> = (
  highSelector: HighSelector,
) => CSSSelector | undefined

const DownSelectContext = createContext<DownSelect<string>>(() => false)

export function useDownSelect<
  XSelector extends string = string
>(): DownSelect<XSelector> {
  return useContext(DownSelectContext)
}

export interface ProvideDownSelectorProps<
  HighSelector extends string = string
> {
  children: ReactNode
  downSelect: DownSelect<HighSelector>
}

export function ProvideDownSelector<HighSelector extends string = string>(
  props: ProvideDownSelectorProps<HighSelector>,
): ReactElement {
  const { children, downSelect: getOverrideSelector } = props
  const getDefaultCSSSelector = useContext(
    DownSelectContext,
  ) as DownSelect<HighSelector>
  const downSelect = useCallback(
    (highSelector: HighSelector) => {
      const overrideSelector = getOverrideSelector(highSelector)
      return overrideSelector !== null && overrideSelector !== undefined
        ? overrideSelector
        : getDefaultCSSSelector(highSelector)
    },
    [getOverrideSelector, getDefaultCSSSelector],
  )

  return (
    <DownSelectContext.Provider value={downSelect as DownSelect<string>}>
      {children}
    </DownSelectContext.Provider>
  )
}
