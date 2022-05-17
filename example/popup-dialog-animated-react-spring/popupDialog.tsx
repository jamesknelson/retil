import React from 'react'
import { createPortal } from 'react-dom'
import { useTransition } from 'react-spring'
import { useHasHydrated } from 'retil-hydration'
import {
  PopupDialogSurface as RetilPopupDialogSurface,
  PopupDialogSurfaceProps as RetilPopupDialogSurfaceProps,
  PopupPlacement,
  usePopupActive,
} from 'retil-interaction'

import { AnimatedPopupCard, createMergeStyle } from './popupStyles'

export interface PopupDialogProps
  extends Omit<
      RetilPopupDialogSurfaceProps,
      'adaptive' | 'gpuAcceleration' | 'mergeStyle' | 'placement'
    >,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'id'> {
  children: React.ReactNode
  placement?: PopupPlacement
}

export function PopupDialog({
  children,
  placement = 'bottom',
  ...restProps
}: PopupDialogProps) {
  const hasHydrated = useHasHydrated()
  const active = usePopupActive()
  const transition = useTransition(active, {
    config: { tension: 415 },
    from: { opacity: 0, top: -10 },
    enter: { opacity: 1, top: 0 },
    leave: { opacity: 0, top: -10 },
  })

  return !hasHydrated
    ? null
    : createPortal(
        transition(
          (transitionProps, displayed, { key }) =>
            displayed && (
              <RetilPopupDialogSurface
                {...restProps}
                // Note: it's important to pass in the current "active", and
                // *not* the transition active - as this ensures that focus
                // moves out of the dialog as soon as it deactivates.
                active={active}
                adaptive={false}
                as={AnimatedPopupCard as any}
                gpuAcceleration={false}
                key={key}
                mergeStyle={createMergeStyle(transitionProps)}
                placement={placement}
                strategy="absolute">
                {children}
              </RetilPopupDialogSurface>
            ),
        ),
        document.body,
      )
}
