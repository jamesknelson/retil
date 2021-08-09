import React, { forwardRef } from 'react'
import { useHasHydrated } from 'retil-hydration'
import { compose } from 'retil-support'

import {
  inActiveSurface,
  inHoveredSurface,
  inHydratingSurface,
  inSelectedSurface,
  inToggledSurface,
} from './defaultSurfaceSelectors'
import { useDisableableConnector } from './disableable'
import { Focusable, useFocusableConnector } from './focusable'
import {
  PopupOptions,
  PopupTriggerOptions,
  splitPopupOptions,
  splitPopupTriggerOptions,
  usePopupConnector,
  usePopupTriggerConnector,
} from './popup'
import { useSelectableConnector } from './selectable'
import {
  SurfaceSelectorOverrides,
  useSurfaceSelectorsConnector,
} from './surfaceSelector'

// ---

export interface PopupDialogSurfaceProps
  extends PopupOptions,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'id' | 'style' | 'tabIndex'> {
  active: boolean
  focusable?: Focusable
  mergeStyle?:
    | React.CSSProperties
    | ((popupStyles: React.CSSProperties) => React.CSSProperties)
  overrideSelectors?: SurfaceSelectorOverrides
}

export const PopupDialogSurface = forwardRef<
  HTMLDivElement,
  PopupDialogSurfaceProps
>(function PopupDialogSurface(props, ref) {
  const { active, focusable, overrideSelectors, ...divAndPopupProps } = props
  const [popupOptions, restProps] = splitPopupOptions(divAndPopupProps)

  const [, mergeFocusableProps, provideFocusable] =
    useFocusableConnector(focusable)

  const [, mergePopupProps, providePopup] = usePopupConnector(
    active,
    popupOptions,
  )

  const [, mergeSurfaceSelectorProps, provideSurfaceSelectors] =
    useSurfaceSelectorsConnector(overrideSelectors)

  // TODO: add focus trap

  const mergeProps: any = compose(
    mergeFocusableProps,
    mergeSurfaceSelectorProps,
    mergePopupProps,
  )

  const provide: (children: React.ReactNode) => React.ReactElement = compose(
    provideFocusable,
    provideSurfaceSelectors,
    providePopup,
  )

  return provide(
    <div
      {...mergeProps({
        ...restProps,
        ref,
        role: 'dialog',
        tabIndex: -1,
      })}
    />,
  )
})

// ---

export interface PopupDialogTriggerSurfaceProps
  extends Omit<PopupTriggerOptions, 'captureKeyboard'>,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'id'> {
  disabled?: boolean
  focusable?: Focusable
  overrideSelectors?: SurfaceSelectorOverrides
}

export const PopupDialogTriggerSurface = forwardRef<
  HTMLDivElement,
  PopupDialogTriggerSurfaceProps
>(function PopupDialogTriggerSurface(props, ref) {
  const isHydrating = !useHasHydrated()
  const [popupTriggerOptions, { focusable, overrideSelectors, ...restProps }] =
    splitPopupTriggerOptions(props)

  const [{ disabled }, mergeDisableableProps, provideDisableable] =
    useDisableableConnector(popupTriggerOptions.disabled)
  const [focusableState, mergeFocusableProps, provideFocusable] =
    useFocusableConnector(focusable)
  const [selectableState, mergeSelectableProps, provideSelectable] =
    useSelectableConnector()

  const [{ active }, mergePopupTriggerProps, providePopupTrigger] =
    usePopupTriggerConnector({
      ...popupTriggerOptions,
      captureKeyboard:
        focusableState.focusable !== true && !!selectableState.selected,
      disabled,
    })

  const [, mergeSurfaceSelectorProps, provideSurfaceSelectors] =
    useSurfaceSelectorsConnector(
      [
        [inActiveSurface, disabled || null],
        [inHoveredSurface, disabled || null],
        [inHydratingSurface, !!isHydrating],
        [inToggledSurface, active],
        [inSelectedSurface, selectableState.selected],
      ],
      overrideSelectors,
    )

  const mergeProps = compose(
    mergeDisableableProps,
    mergeSelectableProps,
    mergeFocusableProps,
    mergeSurfaceSelectorProps,
    mergePopupTriggerProps,
  )

  const provide: (children: React.ReactNode) => React.ReactElement = compose(
    provideDisableable,
    provideSelectable,
    provideFocusable,
    provideSurfaceSelectors,
    providePopupTrigger,
  )

  return provide(
    <div
      {...(mergeProps({
        ...restProps,
        ref,
        role: 'button',
      }) as any)}
    />,
  )
})
