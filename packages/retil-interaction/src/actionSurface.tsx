/**
 * An action surface is a surface with a single primary action, which can be
 * triggered by pressing the action with a pointer, or when focused, by using
 * the enter key.
 *
 * Action surfaces can be configured to not be self-focusable, but instead to
 * to delegate their focus to another element in situations where they would
 * typically receive focus. This can be used to add clickable surfaces which
 * perform individual actions in larger controls where only a single element
 * should be focused.
 *
 * Action surfaces can also be configured to be disabled (i.e. to not perform
 * their single primary action) while remaining focusable.
 */

import React from 'react'

import { inFocusedSurface, inHoveredSurface } from './defaultSurfaceSelectors'
import { useDisableableSurface } from './disableable'
import { Focusable, useFocusable } from './focusable'
import {
  ConnectSurfaceSelectors,
  SurfaceSelectorOverrides,
} from './surfaceSelector'

export interface ActionSurfaceProps {
  disabled?: boolean
  focusable?: Focusable
  overrideSelectors?: SurfaceSelectorOverrides
}

export function splitActionSurfaceProps<P extends ActionSurfaceProps>(
  props: P,
): readonly [ActionSurfaceProps, Omit<P, keyof ActionSurfaceProps>] {
  const { disabled, focusable, overrideSelectors, ...other } = props

  return [
    {
      disabled,
      focusable,
      overrideSelectors,
    },
    other,
  ]
}

// These props can be supplied by the extending surface themselves, and
// should not be passed through.
export interface ConnectActionSurfaceProps<
  TElement extends HTMLElement | SVGElement,
  TMergeProps extends ConnectActionSurfaceMergeableProps<TElement>,
> extends ActionSurfaceProps {
  children: (
    props: TMergeProps & ConnectActionSurfaceMergedProps<TElement>,
  ) => React.ReactNode
  defaultSelectorOverrides?: SurfaceSelectorOverrides
  mergeProps?: TMergeProps
}

export interface ConnectActionSurfaceMergedProps<
  TElement extends HTMLElement | SVGElement,
> {
  'aria-disabled': boolean
  className: string
  onFocus?: (event: React.FocusEvent<TElement>) => void
  onMouseDown?: (event: React.MouseEvent<TElement>) => void
  ref?: React.Ref<TElement>
  tabIndex: number
}

export type ConnectActionSurfaceMergeableProps<
  TElement extends HTMLElement | SVGElement,
> = {
  className?: string
  onFocus?: (event: React.FocusEvent<TElement>) => void
  onMouseDown?: (event: React.MouseEvent<TElement>) => void
  ref?: React.Ref<TElement>
  tabIndex?: number
} & {
  [propName: string]: any
}

export function ConnectActionSurface<
  TElement extends HTMLElement | SVGElement,
  MergeProps extends ConnectActionSurfaceMergeableProps<TElement>,
>(
  props: ConnectActionSurfaceProps<TElement, MergeProps> & {
    mergeProps?: {
      onFocus?: (event: React.FocusEvent<TElement>) => void
      onMouseDown?: (event: React.MouseEvent<TElement>) => void
      ref?: React.Ref<TElement | null>
    }
  },
) {
  const {
    children,
    focusable,
    defaultSelectorOverrides,
    disabled,
    overrideSelectors,
    mergeProps,
  } = props

  const mergeFocusableProps = useFocusable(focusable)
  const [mergeDisabledProps, mergeDisabledSelectorOverrides] =
    useDisableableSurface(disabled)

  return (
    <ConnectSurfaceSelectors
      children={children}
      override={mergeDisabledSelectorOverrides(
        [
          [inFocusedSurface, ':focus'],
          [inHoveredSurface, ':hover'],
        ],
        defaultSelectorOverrides,
        overrideSelectors,
      )}
      mergeProps={mergeDisabledProps(mergeFocusableProps(mergeProps))}
    />
  )
}
