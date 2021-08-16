import React, { forwardRef } from 'react'

import { MenuSurface, MenuSurfaceProps } from './menu'
import { PopupOptions, splitPopupOptions, usePopupConnector } from './popup'

export interface PopupMenuSurfaceProps
  extends PopupOptions,
    Omit<MenuSurfaceProps, 'deselectable' | 'id' | 'style' | 'tabIndex'> {
  active?: boolean
  mergeStyle?:
    | React.CSSProperties
    | ((popupStyles?: React.CSSProperties) => React.CSSProperties)
  placement: NonNullable<PopupOptions['placement']>
}

export const PopupMenuSurface = forwardRef<
  HTMLDivElement,
  PopupMenuSurfaceProps
>(function PopupDialogSurface(props, ref) {
  const { active = true, ...menuAndPopupProps } = props
  const [popupOptions, menuProps] = splitPopupOptions(menuAndPopupProps)

  const [, mergePopupProps, providePopup] = usePopupConnector(
    active,
    popupOptions,
  )

  return providePopup(
    <MenuSurface
      {...mergePopupProps({
        ...menuProps,
        ref,
      })}
      deselectable={null}
      tabIndex={-1}
    />,
  )
})
