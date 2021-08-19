import React, { createElement, forwardRef } from 'react'
import { compose, composeKeyPartitioners } from 'retil-support'

import { Connector } from './connector'
import {
  MenuSurfaceMergeableProps,
  MenuSurfaceMergedProps,
  MenuSurfaceOptions,
  MenuSurfaceSnapshot,
  partitionMenuSurfaceOptions,
  useMenuSurfaceConnector,
  wrapMenuSurfaceChildren,
} from './menu'
import {
  PopupMergeableProps,
  PopupMergedProps,
  PopupOptions,
  PopupSnapshot,
  partitionPopupOptions,
  usePopupConnector,
  usePopupActive,
} from './popup'

export interface PopupMenuSurfaceOptions
  extends PopupOptions,
    Omit<MenuSurfaceOptions, 'deselectable' | 'tabIndex'> {}

export const partitionPopupMenuSurfaceOptions = composeKeyPartitioners(
  partitionPopupOptions,
  partitionMenuSurfaceOptions,
)

export type PopupMenuSurfaceSnapshot = PopupSnapshot & MenuSurfaceSnapshot

export type PopupMenuSurfaceMergedProps<
  TElement extends HTMLElement | SVGElement,
> = MenuSurfaceMergedProps<TElement> & PopupMergedProps<TElement>

export type PopupMenuSurfaceMergeableProps<
  TElement extends HTMLElement | SVGElement,
> = MenuSurfaceMergeableProps<TElement> & PopupMergeableProps<TElement>

export type MergePopupMenuSurfaceProps = <
  TElement extends HTMLElement | SVGElement,
  TMergeProps extends PopupMenuSurfaceMergeableProps<TElement> &
    Record<string, any> = {},
>(
  mergeProps?: TMergeProps &
    PopupMenuSurfaceMergeableProps<TElement> &
    Record<string, any>,
) => Omit<TMergeProps, keyof PopupMenuSurfaceMergeableProps<TElement>> &
  PopupMenuSurfaceMergedProps<TElement>

export type PopupMenuSurfaceConnector = Connector<
  PopupMenuSurfaceSnapshot,
  MergePopupMenuSurfaceProps
>

export function usePopupMenuSurfaceConnector(
  active: boolean,
  options: PopupMenuSurfaceOptions,
): PopupMenuSurfaceConnector {
  const [popupOptions, menuOptions] = partitionPopupOptions(options)

  const [menuSnapshot, mergeMenuProps, provideMenu] = useMenuSurfaceConnector({
    ...menuOptions,
    disabled: options.disabled ?? !active,
    deselectable: null,
    tabIndex: -1,
  })
  const [popupSnapshot, mergePopupProps, providePopup] = usePopupConnector(
    active,
    popupOptions,
  )

  const snapshot = { ...menuSnapshot, ...popupSnapshot }
  const mergeProps: MergePopupMenuSurfaceProps = compose(
    mergePopupProps as any,
    mergeMenuProps as any,
  )
  const provide = compose(providePopup, provideMenu)

  return [snapshot, mergeProps, provide]
}

// ---

export interface PopupMenuSurfaceProps
  extends Omit<PopupMenuSurfaceOptions, 'actionCount'>,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'id' | 'tabIndex'> {
  actionCount?: number
  active?: boolean
  as?: React.ElementType<React.RefAttributes<HTMLDivElement>>
}

export const PopupMenuSurface = forwardRef<
  HTMLDivElement,
  PopupMenuSurfaceProps
>(function PopupMenuSurface(
  { actionCount: actionCountProp, children: childrenProp, ...props },
  ref,
) {
  const activeDefault = usePopupActive()
  const [children, actionCountDefault] = wrapMenuSurfaceChildren(childrenProp)
  const [options, { active = activeDefault, as: asProp = 'div', ...rest }] =
    partitionPopupMenuSurfaceOptions({
      ...props,
      actionCount: actionCountProp ?? actionCountDefault,
    })
  const [, mergeProps, provide] = usePopupMenuSurfaceConnector(active, options)
  return provide(
    createElement(
      asProp,
      mergeProps({
        ref,
        ...rest,
        children,
      }),
    ),
  )
})
