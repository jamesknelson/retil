/**
 * Provides hooks to disable various interactions, either in a single component,
 * or with the help of the <DisableableProvider>, in an entire subtree.
 */

import React, { ProviderProps, createContext, useContext } from 'react'

import { Connector } from './connector'

const disabledContext = /*#__PURE__*/ createContext<boolean>(false)

// NOTE: this is a function instead of a direct export, as it allows for
// tree shaking of the provider.
export function DisabledProvider(props: ProviderProps<boolean>) {
  return <disabledContext.Provider {...props} />
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

export interface DisableableSnapshot {
  disabled: boolean
}

export type DisableableConnector = Connector<
  DisableableSnapshot,
  MergeDisableableProps
>

export function useDisabledContext(
  disabledOverride?: boolean | undefined,
): boolean {
  const disabledDefault = useContext(disabledContext)
  return disabledOverride ?? disabledDefault
}

export function useDisableableConnector(
  disabledOverride?: boolean,
): DisableableConnector {
  const disabled = useDisabledContext(disabledOverride)

  const mergeDisabledProps = ({ disabled: _, ...rest }: any = {}) => ({
    'aria-disabled': disabled || undefined,
    ...rest,
  })

  const provider = (children: React.ReactNode) => (
    <DisabledProvider value={disabled}>{children}</DisabledProvider>
  )

  return [{ disabled }, mergeDisabledProps, provider]
}
