import React, { createElement, forwardRef } from 'react'
import {
  KeyPartitioner,
  compose,
  composeKeyPartitioners,
  partitionByKeys,
} from 'retil-support'

import { Connector } from '../connector'
import {
  FocusableTrapMergeableProps,
  FocusableTrapMergedProps,
  useFocusableTrapConnector,
} from '../focusableTrap'
import {
  PopupMergeableProps,
  PopupMergedProps,
  PopupSnapshot,
  PopupOptions,
  partitionPopupOptions,
  usePopupConnector,
  usePopupActive,
} from '../popup'
import {
  SurfaceSelectorOverrides,
  SurfaceSelectorsMergeableProps,
  SurfaceSelectorsMergedProps,
  useSurfaceSelectorsConnector,
} from '../surfaceSelector'

export interface PopupDialogSurfaceOptions
  extends PopupOptions,
    PopupDialogSurfaceOwnOptions {}

interface PopupDialogSurfaceOwnOptions {
  initialFocusRef?: React.RefObject<HTMLElement | SVGElement | null>
  overrideSelectors?: SurfaceSelectorOverrides
}

const partitionPopupDialogSurfaceOwnOptions: KeyPartitioner<
  PopupDialogSurfaceOwnOptions
> = (object) =>
  partitionByKeys(['initialFocusRef', 'overrideSelectors'], object)

export const partitionPopupDialogSurfaceOptions =
  /*#__PURE__*/ composeKeyPartitioners(
    partitionPopupDialogSurfaceOwnOptions,
    partitionPopupOptions,
  )

export type PopupDialogSurfaceSnapshot = PopupSnapshot

export type PopupDialogSurfaceMergedProps<
  TElement extends HTMLElement | SVGElement,
> = FocusableTrapMergedProps<TElement> &
  SurfaceSelectorsMergedProps &
  PopupMergedProps<TElement>

export type PopupDialogSurfaceMergeableProps<
  TElement extends HTMLElement | SVGElement,
> = FocusableTrapMergeableProps<TElement> &
  SurfaceSelectorsMergeableProps &
  PopupMergeableProps<TElement>

export type MergePopupDialogSurfaceProps = <
  TElement extends HTMLElement | SVGElement,
  TMergeProps extends PopupDialogSurfaceMergeableProps<TElement> &
    Record<string, any> = {},
>(
  mergeProps?: TMergeProps &
    PopupDialogSurfaceMergeableProps<TElement> &
    Record<string, any>,
) => Omit<TMergeProps, keyof PopupDialogSurfaceMergeableProps<TElement>> &
  PopupDialogSurfaceMergedProps<TElement>

export type PopupDialogSurfaceConnector = Connector<
  PopupSnapshot,
  MergePopupDialogSurfaceProps
>

export function usePopupDialogSurfaceConnector(
  active: boolean,
  options: PopupDialogSurfaceOptions = {},
): PopupDialogSurfaceConnector {
  const [{ initialFocusRef, overrideSelectors }, popupOptions] =
    partitionPopupDialogSurfaceOwnOptions(options)

  const [, mergeFocusableTrapProps, provideFocusableTrap] =
    useFocusableTrapConnector(active, {
      initialFocusRef,
    })

  const [popupSnapshot, mergePopupProps, providePopup] = usePopupConnector(
    active,
    popupOptions,
  )

  const [, mergeSurfaceSelectorProps, provideSurfaceSelectors] =
    useSurfaceSelectorsConnector(overrideSelectors)

  const mergeProps: MergePopupDialogSurfaceProps = (
    rawMergeProps = {} as any,
  ) => {
    const { role, ...mergeProps } = mergePopupProps(
      mergeSurfaceSelectorProps(mergeFocusableTrapProps(rawMergeProps)),
    )
    return {
      ...mergeProps,
      role: 'dialog',
    } as any
  }

  const provide = compose(
    providePopup,
    provideFocusableTrap,
    provideSurfaceSelectors,
  )

  return [popupSnapshot, mergeProps, provide]
}

// ---

export interface PopupDialogSurfaceProps
  extends PopupDialogSurfaceOptions,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'id' | 'tabIndex'> {
  active?: boolean
  as?: React.ElementType<React.RefAttributes<HTMLDivElement>>
}

export const PopupDialogSurface = /*#__PURE__*/ forwardRef<
  HTMLDivElement,
  PopupDialogSurfaceProps
>(function PopupDialogSurface(props, ref) {
  const activeDefault = usePopupActive()
  const [options, { active = activeDefault, as: asProp = 'div', ...rest }] =
    partitionPopupDialogSurfaceOptions(props)
  const [, mergeProps, provide] = usePopupDialogSurfaceConnector(
    active,
    options,
  )
  return provide(
    createElement(
      asProp,
      mergeProps({
        ref,
        ...rest,
      }),
    ),
  )
})
