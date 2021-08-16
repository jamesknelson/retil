import React, { forwardRef } from 'react'
import { compose } from 'retil-support'

import { useFocusableTrapConnector } from './focusableTrap'
import { PopupOptions, splitPopupOptions, usePopupConnector } from './popup'
import {
  SurfaceSelectorOverrides,
  useSurfaceSelectorsConnector,
} from './surfaceSelector'

export interface PopupDialogSurfaceProps
  extends PopupOptions,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'id' | 'style' | 'tabIndex'> {
  active?: boolean
  initialFocusRef?: React.RefObject<HTMLElement | SVGElement | null>
  mergeStyle?:
    | React.CSSProperties
    | ((popupStyles: React.CSSProperties) => React.CSSProperties)
  overrideSelectors?: SurfaceSelectorOverrides
  placement: NonNullable<PopupOptions['placement']>
}

export const PopupDialogSurface = forwardRef<
  HTMLDivElement,
  PopupDialogSurfaceProps
>(function PopupDialogSurface(props, ref) {
  const {
    active = true,
    initialFocusRef,
    overrideSelectors,
    ...divAndPopupProps
  } = props
  const [popupOptions, restProps] = splitPopupOptions(divAndPopupProps)

  const [, mergeFocusableTrapProps, provideFocusableTrap] =
    useFocusableTrapConnector(active, {
      initialFocusRef,
    })

  const [, mergePopupProps, providePopup] = usePopupConnector(
    active,
    popupOptions,
  )

  const [, mergeSurfaceSelectorProps, provideSurfaceSelectors] =
    useSurfaceSelectorsConnector(overrideSelectors)

  const mergeProps: any = compose(
    mergeFocusableTrapProps,
    mergeSurfaceSelectorProps,
    mergePopupProps,
  )

  const provide: (children: React.ReactNode) => React.ReactElement = compose(
    providePopup,
    provideFocusableTrap,
    provideSurfaceSelectors,
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
