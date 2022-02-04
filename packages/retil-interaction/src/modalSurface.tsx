import React, { forwardRef, useMemo, useRef } from 'react'
import { compose, useJoinedEventHandler, useJoinRefs } from 'retil-support'

import { useEscapeConnector } from './escape'
import { useFocusableTrapConnector } from './focusableTrap'
import {
  SurfaceSelectorOverrides,
  useSurfaceSelectorsConnector,
} from './surfaceSelector'
import { useUnscrollableBody } from './unscrollableBody'

const modalSurfaceStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
}

export interface ModalSurfaceProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'tabIndex'> {
  active?: boolean
  closeOnEscape?: boolean
  closeOnOutsideClick?: boolean
  initialFocusRef?: React.RefObject<HTMLElement | SVGElement | null>
  onClose: () => void
  overrideSelectors?: SurfaceSelectorOverrides
}

export const ModalSurface = forwardRef<HTMLDivElement, ModalSurfaceProps>(
  function ModalSurface(props, forwardedRef) {
    const {
      active = true,
      closeOnEscape = true,
      closeOnOutsideClick = true,
      initialFocusRef,
      onClose,
      overrideSelectors,
      ...divProps
    } = props

    const [, mergeEscapeProps, provideEscape] = useEscapeConnector(
      active && closeOnEscape ? onClose : null,
    )

    const elementRef = useRef<HTMLDivElement>(null)
    const handleClick = useMemo(
      () =>
        !closeOnOutsideClick
          ? undefined
          : (event: React.MouseEvent) => {
              if (event.target === elementRef.current) {
                onClose()
              }
            },
      [closeOnOutsideClick, onClose],
    )

    const [, mergeFocusableTrapProps, provideFocusableTrap] =
      useFocusableTrapConnector(active, {
        initialFocusRef,
        passThrough: false,
      })

    const [, mergeSurfaceSelectorProps, provideSurfaceSelectors] =
      useSurfaceSelectorsConnector(overrideSelectors)

    const mergeProps: any = compose(
      mergeEscapeProps as any,
      mergeFocusableTrapProps as any,
      mergeSurfaceSelectorProps,
    )

    const provide: (children: React.ReactNode) => React.ReactElement = compose(
      provideEscape,
      provideFocusableTrap,
      provideSurfaceSelectors,
    )

    useUnscrollableBody(active)

    const joinRefs = useJoinRefs()
    return provide(
      <div
        {...mergeProps({
          ...divProps,
          onClick: useJoinedEventHandler(divProps.onClick, handleClick),
          ref: joinRefs(elementRef, forwardedRef),
          role: 'dialog',
          tabIndex: -1,
          style: {
            ...modalSurfaceStyles,
            ...divProps.style,
          },
        })}
      />,
    )
  },
)
