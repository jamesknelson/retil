import React, {
  ReactNode,
  ReactElement,
  createContext,
  useContext,
  useMemo,
} from 'react'
import { identity } from 'retil-support'

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
 * will be used. If there is no parent selector, then the selector will be used
 * as-is.
 */
export type DownSelect<HighSelector extends string> = (
  highSelector: HighSelector,
) => CSSSelector | undefined

const DownSelectContext = createContext<DownSelect<string>>(identity)

export function useDownSelect<HighSelector extends string = string>(
  overrideDownSelect?: DownSelect<HighSelector>,
): DownSelect<HighSelector> {
  const contextDownSelect = useContext(
    DownSelectContext,
  ) as DownSelect<HighSelector>

  const downSelect = useMemo(
    () =>
      overrideDownSelect
        ? (highSelector: HighSelector) => {
            const overrideSelector = overrideDownSelect(highSelector)
            return overrideSelector !== null && overrideSelector !== undefined
              ? overrideSelector
              : contextDownSelect(highSelector)
          }
        : contextDownSelect,
    [overrideDownSelect, contextDownSelect],
  )

  return downSelect
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
  const contextValue = useDownSelect(props.downSelect) as DownSelect<string>
  return (
    <DownSelectContext.Provider value={contextValue}>
      {props.children}
    </DownSelectContext.Provider>
  )
}
