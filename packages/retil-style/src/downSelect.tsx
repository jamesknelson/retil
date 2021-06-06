import React, {
  ReactNode,
  ReactElement,
  createContext,
  useContext,
  useMemo,
} from 'react'

import { DownSelect } from './styleTypes'

const DownSelectContext = createContext<DownSelect<string>>(
  (highSelector: string) => {
    return highSelector === 'default' ? true : highSelector
  },
)

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
            if (highSelector === 'default') {
              return true
            }
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
  HighSelector extends string = string,
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
