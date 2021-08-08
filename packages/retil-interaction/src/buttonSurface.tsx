import React, { forwardRef } from 'react'
import { useHasHydrated } from 'retil-hydration'

import {
  ActionSurfaceOptions,
  splitActionSurfaceOptions,
  useActionSurfaceConnector,
} from './actionSurface'
import { inHydratingSurface, inToggledSurface } from './defaultSurfaceSelectors'
import { useMergeKeyboardProps } from './keyboard'
import { useJoinedEventHandler } from './joinEventHandlers'
import { useKeyMapHandler } from './keyboard'
import { mergeOverrides } from './surfaceSelector'

export interface ButtonSurfaceProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'aria-pressed' | 'role'>,
    ActionSurfaceOptions {
  /**
   * Called after `onClick`, unless the `onClick` handle calls
   * `event.preventDefault()`.
   *
   * While `onClick` will still be called while disabled, `onTrigger` can be
   * disabled with the `disabled` prop.
   *
   * Note that this will also be called when the user hits `enter` while the
   * button is focused, as this will cause the browse to emulate a `click`
   * event.
   */
  onTrigger?: (event: React.SyntheticEvent) => void

  /**
   * Mark that the button is currently activated. This will be exposed to
   * screen-readers via `aria-pressed`, and exposed in styles via the `toggled`
   * surface selector.
   */
  pressed?: boolean
}

export const ButtonSurface = forwardRef<HTMLDivElement, ButtonSurfaceProps>(
  function ButtonSurface(props, ref) {
    const isHydrating = !useHasHydrated()

    const [actionSurfaceOptions, { onClick, onTrigger, pressed, ...rest }] =
      splitActionSurfaceOptions(props)
    const [actionSurfaceState, mergeActionSurfaceProps, provideActionSurface] =
      useActionSurfaceConnector({
        ...actionSurfaceOptions,
        overrideSelectors: mergeOverrides(
          [
            [inHydratingSurface, !!isHydrating],
            [inToggledSurface, '[aria-pressed="true"]'],
          ],
          actionSurfaceOptions.overrideSelectors,
        ),
      })

    const keyboardHandler = useKeyMapHandler({
      ' ': onTrigger,
      Enter: onTrigger,
    })
    const mergeKeyboardProps = useMergeKeyboardProps(
      actionSurfaceState.disabled ? null : keyboardHandler,
      {
        capture:
          actionSurfaceState.focusable !== true &&
          !!actionSurfaceState.selected,
      },
    )

    return provideActionSurface(
      <div
        {...mergeKeyboardProps(
          mergeActionSurfaceProps({
            ...rest,
            'aria-pressed': pressed,
            onClick: useJoinedEventHandler(
              onClick,
              actionSurfaceState.disabled ? undefined : onTrigger,
            ),
            ref,
            role: 'button',
          }),
        )}
      />,
    )
  },
)
