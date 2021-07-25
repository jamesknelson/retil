/**
 * Provides hooks to disable various interactions, either in a single component,
 * or with the help of the <DisableableProvider>, in an entire subtree.
 */

import React, { createContext, useCallback, useContext } from 'react'
import { preventDefaultEventHandler } from 'retil-support'

import {
  inActiveSurface,
  inDisabledSurface,
  inHoveredSurface,
} from './defaultSurfaceSelectors'
import { useJoinedEventHandler } from './joinEventHandlers'
import { mergeOverrides, SurfaceSelector } from './surfaceSelector'

const defaultDisabledSelectors = [inActiveSurface, inHoveredSurface]

const disabledContext = createContext<boolean>(false)

export const DisabledProvider = disabledContext.Provider

export function useDisabled(disabledArg: boolean | undefined) {
  const context = useContext(disabledContext)
  const disabled = disabledArg ?? context
  return disabled
}

export interface DisableableSurfaceMergedProps {
  'aria-disabled': boolean
}

export type DisableableSurfaceMergeableProps = {
  'aria-disabled'?: boolean | 'false' | 'true'
  disabled?: never
} & {
  [propName: string]: any
}

export type MergeDisableableSurfaceProps = <
  MergeProps extends DisableableSurfaceMergeableProps = {},
>(
  mergeProps?: MergeProps & DisableableSurfaceMergeableProps,
) => MergeProps & DisableableSurfaceMergedProps

export function useDisableableSurface(
  disabledArg: boolean | undefined,
  selectors: SurfaceSelector[] = defaultDisabledSelectors,
) {
  const disabled = useDisabled(disabledArg)

  const mergeDisabledSelectorOverrides = useCallback<typeof mergeOverrides>(
    (...overrides) =>
      mergeOverrides(
        [[inDisabledSurface, !!disabled as boolean | null] as const].concat(
          selectors.map(
            (selector) => [selector, disabled ? false : null] as const,
          ),
        ),
        ...overrides,
      ),
    [disabled, selectors],
  )

  const mergeDisabledProps = useCallback<MergeDisableableSurfaceProps>(
    ({ disabled: _, ...rest }: any) => ({
      'aria-disabled': disabled || undefined,
      ...rest,
    }),
    [disabled],
  )

  return [mergeDisabledProps, mergeDisabledSelectorOverrides] as const
}

export function useDisableableEventHandler<E extends React.SyntheticEvent>(
  disabledArg: boolean | undefined,
  eventHandler: React.EventHandler<E>,
): React.EventHandler<E>
export function useDisableableEventHandler<E extends React.SyntheticEvent>(
  disabledArg: boolean | undefined,
  eventHandler?: undefined,
): React.EventHandler<E> | undefined
export function useDisableableEventHandler<E extends React.SyntheticEvent>(
  disabledArg: boolean | undefined,
  eventHandler: React.EventHandler<E> | undefined,
): React.EventHandler<E> | undefined
export function useDisableableEventHandler<E extends React.SyntheticEvent>(
  disabledArg: boolean | undefined,
  eventHandler: React.EventHandler<E> | undefined,
): React.EventHandler<E> | undefined {
  const disabled = useDisabled(disabledArg)
  return useJoinedEventHandler(
    disabled ? preventDefaultEventHandler : undefined,
    eventHandler,
  )
}
