/**
 * Provides hooks to disable various interactions, either in a single component,
 * or with the help of the <DisableableProvider>, in an entire subtree.
 */

import React, { createContext, useCallback, useContext } from 'react'

const disabledContext = createContext<boolean>(false)

export const DisabledProvider = disabledContext.Provider

export function useDisabled() {
  return useContext(disabledContext)
}

export interface DisableableMergedProps {
  'aria-disabled': boolean | 'false' | 'true'
}

export type DisableableMergeableProps = {
  'aria-disabled'?: boolean | 'false' | 'true'
  disabled?: never
}

export type MergeDisableableProps = <
  MergeProps extends DisableableMergeableProps & Record<string, any> = {},
>(
  mergeProps?: MergeProps,
) => Omit<MergeProps, keyof DisableableMergeableProps> & DisableableMergedProps

export function useDisableableConnector(
  disabledArg: boolean | undefined,
): readonly [
  state: { disabled: boolean },
  mergeProps: MergeDisableableProps,
  provide: (children: React.ReactNode) => React.ReactElement,
] {
  const disabledDefault = useContext(disabledContext)
  const disabled = disabledArg ?? disabledDefault

  const mergeDisabledProps = useCallback<MergeDisableableProps>(
    ({ disabled: _, ...rest }: any = {}) => ({
      'aria-disabled': disabled || undefined,
      ...rest,
    }),
    [disabled],
  )

  const provider = useCallback(
    (children: React.ReactNode) => (
      <DisabledProvider value={disabled}>{children}</DisabledProvider>
    ),
    [disabled],
  )

  return [{ disabled }, mergeDisabledProps, provider]
}
