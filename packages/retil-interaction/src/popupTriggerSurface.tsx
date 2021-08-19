import React, { forwardRef, useCallback, useEffect, useRef } from 'react'
import { useHasHydrated } from 'retil-hydration'
import { compose, fromEntries, useJoinRefs } from 'retil-support'

import { useConfigurator } from './configurator'
import { Connector } from './connector'
import {
  inActiveSurface,
  inHoveredSurface,
  inHydratingSurface,
  inSelectedSurface,
  inToggledSurface,
} from './defaultSurfaceSelectors'
import { useDisableableConnector } from './disableable'
import { Focusable, useFocusableContext } from './focusable'
import { useFocusableSelectableConnector } from './focusableSelectable'
import { useKeyMapHandler, useKeyboard } from './keyboard'
import { usePopupActive, usePopupHandle, usePopupIds } from './popup'
import {
  PopupTriggerConfig,
  popupTriggerServiceConfigurator,
  splitPopupTriggerConfig,
} from './popupTrigger'
import {
  SurfaceSelectorOverrides,
  useSurfaceSelectorsConnector,
} from './surfaceSelector'

export interface PopupTriggerMergedProps<
  TElement extends HTMLElement | SVGElement,
> {
  'aria-controls': string
  'aria-expanded': boolean
  'aria-haspopup': boolean
  id: string
  onKeyDown?: (event: React.KeyboardEvent<TElement>) => void
  ref: (element: TElement) => void
}

export type PopupTriggerMergeableProps<
  TElement extends HTMLElement | SVGElement,
> = {
  'aria-controls'?: never
  'aria-expanded'?: never
  'aria-haspopup'?: never
  id?: never
  onKeyDown?: (event: React.KeyboardEvent<TElement>) => void
  ref?: React.Ref<TElement>
}

export type MergePopupTriggerProps = <
  TElement extends HTMLElement | SVGElement,
  TMergeProps extends PopupTriggerMergeableProps<TElement> &
    Record<string, any> = {},
>(
  mergeProps?: TMergeProps &
    PopupTriggerMergeableProps<TElement> &
    Record<string, any>,
) => Omit<TMergeProps, keyof PopupTriggerMergeableProps<TElement>> &
  PopupTriggerMergedProps<TElement>

export interface PopupTriggerOptions extends PopupTriggerConfig {
  captureKeyboard?: boolean
  externalReference?: boolean
  triggerOnKeys?: string[]
}

export function splitPopupTriggerOptions<P extends PopupTriggerOptions>(
  props: P,
): readonly [PopupTriggerOptions, Omit<P, keyof PopupTriggerOptions>] {
  const { captureKeyboard, externalReference, triggerOnKeys, ...notOurs } =
    props
  const [popupTriggerConfig, rest] = splitPopupTriggerConfig(notOurs)

  return [
    {
      captureKeyboard,
      externalReference,
      triggerOnKeys,
      ...popupTriggerConfig,
    },
    rest as Omit<P, keyof PopupTriggerOptions>,
  ]
}

export interface PopupTriggerSnapshot {
  active: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export type PopupTriggerConnector = Connector<
  PopupTriggerSnapshot,
  MergePopupTriggerProps
>

export function usePopupTriggerConnector(
  options: PopupTriggerOptions,
): PopupTriggerConnector {
  const {
    captureKeyboard = false,
    externalReference = false,
    triggerOnKeys = ['Enter', ' '],
    ...triggerConfig
  } = options

  const active = usePopupActive()
  const ids = usePopupIds()
  const popupHandle = usePopupHandle()

  const [activeSource, triggerHandle] = useConfigurator(
    popupTriggerServiceConfigurator,
    triggerConfig,
  )
  const { open, setTriggerElement } = triggerHandle

  const cleanupRef = useRef<(() => void) | null>()

  useEffect(
    () => () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    },
    [],
  )

  const keyMapHandler = useKeyMapHandler(
    fromEntries(triggerOnKeys.map((key) => [key, open])),
  )
  const [, mergeKeyboardProps, provideKeyboard] = useKeyboard(
    options.disabled ? null : keyMapHandler,
    {
      capture: captureKeyboard,
    },
  )

  const triggerRef = useCallback(
    (element: SVGElement | HTMLElement | null) => {
      // Adds event handlers, but does not cause any changes in state
      setTriggerElement(element)

      if (cleanupRef.current) {
        cleanupRef.current()
      }
      if (!externalReference) {
        popupHandle.setReferenceElement(element)
      }
      if (element) {
        cleanupRef.current = popupHandle.setTriggerService([
          activeSource,
          triggerHandle,
        ])
      }
    },
    [
      activeSource,
      externalReference,
      popupHandle,
      setTriggerElement,
      triggerHandle,
    ],
  )

  const joinRefs = useJoinRefs()

  const mergeProps: MergePopupTriggerProps = (rawMergeProps = {} as any) => {
    const mergeProps = mergeKeyboardProps(rawMergeProps)
    const popupTriggerMergedProps: PopupTriggerMergedProps<any> = {
      id: ids.triggerId,
      ref: joinRefs(triggerRef, mergeProps?.ref),
      'aria-controls': ids.popupId,
      'aria-expanded': active,
      'aria-haspopup': true,
    }

    return Object.assign({
      ...mergeProps,
      ...popupTriggerMergedProps,
    })
  }

  const snapshot: PopupTriggerSnapshot = {
    active,
    open: triggerHandle.open,
    close: triggerHandle.close,
    toggle: triggerHandle.toggle,
  }

  return [snapshot, mergeProps, provideKeyboard]
}

export interface PopupTriggerSurfaceProps
  extends Omit<PopupTriggerOptions, 'captureKeyboard'>,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'id'> {
  disabled?: boolean
  focusable?: Focusable
  overrideSelectors?: SurfaceSelectorOverrides
}

export const PopupTriggerSurface = forwardRef<
  HTMLDivElement,
  PopupTriggerSurfaceProps
>(function PopupTriggerSurface(props, ref) {
  const isHydrating = !useHasHydrated()
  const [
    popupTriggerOptions,
    { focusable: focusableProp, overrideSelectors, ...restProps },
  ] = splitPopupTriggerOptions(props)

  const focusable = useFocusableContext(focusableProp)

  const [{ disabled }, mergeDisableableProps, provideDisableable] =
    useDisableableConnector(popupTriggerOptions.disabled)

  const [
    { deselectedDuringHover, selected, selectAndHold },
    mergeSelectableProps,
    provideSelectable,
  ] = useFocusableSelectableConnector(focusable)

  const [{ active, close }, mergePopupTriggerProps, providePopupTrigger] =
    usePopupTriggerConnector({
      ...popupTriggerOptions,
      captureKeyboard: focusable !== true && !!selected,
      disabled,
    })

  const [, mergeSurfaceSelectorProps, provideSurfaceSelectors] =
    useSurfaceSelectorsConnector(
      [
        [inActiveSurface, disabled ? false : null],
        [inHoveredSurface, disabled || deselectedDuringHover ? false : null],
        [inHydratingSurface, !!isHydrating],
        [inToggledSurface, active],
        [inSelectedSurface, selected],
      ],
      overrideSelectors,
    )

  useEffect(() => {
    if (active) {
      return selectAndHold()
    }
  }, [active, selectAndHold])

  useEffect(() => {
    if (!selected) {
      close()
    }
  }, [close, selected])

  const mergeProps: any = compose(
    mergeDisableableProps,
    mergeSelectableProps as any,
    mergeSurfaceSelectorProps,
    mergePopupTriggerProps as any,
  )

  const provide: (children: React.ReactNode) => React.ReactElement = compose(
    provideDisableable,
    provideSelectable,
    provideSurfaceSelectors,
    providePopupTrigger,
  )

  return provide(
    <div
      {...mergeProps({
        ...restProps,
        ref,
        role: 'button',
      })}
    />,
  )
})
