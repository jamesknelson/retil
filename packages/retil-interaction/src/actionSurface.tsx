/**
 * An action surface is a surface with a single primary action, which can be
 * triggered by pressing the action with a pointer, or when focused or selected,
 * by using at least one of the enter or space key.
 *
 * Action surfaces can be configured to not be self-focusable, but instead to
 * to delegate their focus to another element in situations where they would
 * typically receive focus. This can be used to add clickable surfaces which
 * perform individual actions in larger controls where only a single element
 * should be focused. In such situations, the surfaces can still be
 * "selectable", if placed in a selectable item context.
 *
 * Action surfaces can also be configured to be disabled (i.e. to not perform
 * their single primary action) while remaining focusable.
 */

import React, { useMemo } from 'react'
import { compose } from 'retil-support'

import {
  inActiveSurface,
  inHoveredSurface,
  inSelectedSurface,
} from './defaultSurfaceSelectors'
import {
  DisableableMergeableProps,
  DisableableMergedProps,
  useDisableableConnector,
} from './disableable'
import { useEscapeContext } from './escape'
import {
  Focusable,
  FocusableMergeableProps,
  FocusableMergedProps,
  useFocusableConnector,
} from './focusable'
import {
  FocusableSelectableMergeableProps,
  FocusableSelectableMergedProps,
  useFocusableSelectableConnector,
} from './focusableSelectable'
import { useMenuContext } from './menu'
import {
  SurfaceSelectorOverrides,
  SurfaceSelectorsMergeableProps,
  SurfaceSelectorsMergedProps,
  useSurfaceSelectorsConnector,
} from './surfaceSelector'

export interface ActionSurfaceOptions {
  disabled?: boolean
  focusable?: Focusable
  overrideSelectors?: SurfaceSelectorOverrides
}

export function splitActionSurfaceOptions<P extends ActionSurfaceOptions>(
  props: P,
): readonly [ActionSurfaceOptions, Omit<P, keyof ActionSurfaceOptions>] {
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

export type ActionSurfaceMergedProps<
  TElement extends HTMLElement | SVGElement,
> = DisableableMergedProps &
  FocusableMergedProps<TElement> &
  FocusableSelectableMergedProps<TElement> &
  SurfaceSelectorsMergedProps

export type ActionSurfaceMergableProps<
  TElement extends HTMLElement | SVGElement,
> = DisableableMergeableProps &
  FocusableMergeableProps<TElement> &
  FocusableSelectableMergeableProps<TElement> &
  SurfaceSelectorsMergeableProps

export type MergeActionSurfaceFocusableProps = <
  TElement extends HTMLElement | SVGElement = HTMLElement | SVGElement,
  MergeProps extends ActionSurfaceMergableProps<TElement> &
    Record<string, any> = {},
>(
  mergeProps?: MergeProps &
    ActionSurfaceMergableProps<TElement> &
    Record<string, any>,
) => Omit<MergeProps, keyof ActionSurfaceMergableProps<TElement>> &
  ActionSurfaceMergedProps<TElement>

export function useActionSurfaceConnector(options: ActionSurfaceOptions = {}) {
  const { disabled, focusable, overrideSelectors } = options

  const escape = useEscapeContext()
  const menuContext = useMenuContext()

  const [disableableState, mergeDisableableProps, provideDisableable] =
    useDisableableConnector(disabled)
  const [focusableState, mergeFocusableProps, provideFocusable] =
    useFocusableConnector(focusable)
  const [selectableState, mergeSelectableProps, provideSelectable] =
    useFocusableSelectableConnector()
  const [
    surfaceSelectorsState,
    mergeSurfaceSelectorProps,
    provideSurfaceSelectors,
  ] = useSurfaceSelectorsConnector(
    [[inActiveSurface, disableableState.disabled ? false : null]],
    [
      [
        inHoveredSurface,
        disableableState.disabled || selectableState.deselectedDuringHover
          ? false
          : null,
      ],
    ],
    [[inSelectedSurface, selectableState.selected]],
    overrideSelectors,
  )

  const complete = useMemo(
    () => (!!menuContext && escape) || undefined,
    [escape, menuContext],
  )

  const state = {
    complete,
    ...disableableState,
    ...focusableState,
    ...selectableState,
    ...surfaceSelectorsState,
  }

  const mergeProps: MergeActionSurfaceFocusableProps = compose(
    mergeDisableableProps as any,
    mergeSelectableProps as any,
    mergeFocusableProps as any,
    mergeSurfaceSelectorProps,
  )

  const provide: (children: React.ReactNode) => React.ReactElement = compose(
    provideDisableable,
    provideSelectable,
    provideFocusable,
    provideSurfaceSelectors,
  )

  return [state, mergeProps, provide] as const
}
