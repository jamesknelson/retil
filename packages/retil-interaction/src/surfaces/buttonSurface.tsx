import React, { forwardRef, useMemo } from 'react'
import { useHasHydrated } from 'retil-hydration'
import { useJoinedEventHandler } from 'retil-support'

import {
  inHydratingSurface,
  inToggledSurface,
} from '../defaultSurfaceSelectors'
import { useKeyboard } from '../keyboard'
import { useKeyMapHandler } from '../keyboard'
import { mergeOverrides } from '../surfaceSelector'

import {
  ActionSurfaceOptions,
  splitActionSurfaceOptions,
  useActionSurfaceConnector,
} from './actionSurface'

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

export const ButtonSurface = /*#__PURE__*/ forwardRef<
  HTMLDivElement,
  ButtonSurfaceProps
>(function ButtonSurface(props, ref) {
  const isHydrating = !useHasHydrated()

  const [actionSurfaceOptions, { onClick, onTrigger, pressed, ...rest }] =
    splitActionSurfaceOptions(props)
  const [
    { complete, disabled, focusable, selected },
    mergeActionSurfaceProps,
    provideActionSurface,
  ] = useActionSurfaceConnector({
    ...actionSurfaceOptions,
    overrideSelectors: mergeOverrides(
      [
        [inHydratingSurface, !!isHydrating],
        [inToggledSurface, '[aria-pressed="true"]'],
      ],
      actionSurfaceOptions.overrideSelectors,
    ),
  })

  // We can't just use a standard event handler join becausfe we always
  // want to run complete, even if trigger cancels the default action.
  const triggerAndComplete = useMemo(
    () =>
      !complete && !onTrigger
        ? undefined
        : !complete || !onTrigger
        ? complete || onTrigger
        : (event: React.SyntheticEvent) => {
            onTrigger(event)
            complete()
          },
    [complete, onTrigger],
  )

  const keyboardHandler = useKeyMapHandler({
    ' ': triggerAndComplete,
    Enter: triggerAndComplete,
  })
  const [, mergeKeyboardProps, provideKeyboard] = useKeyboard(
    disabled ? null : keyboardHandler,
    {
      capture: focusable !== true && !!selected,
    },
  )

  return provideKeyboard(
    provideActionSurface(
      <div
        {...mergeKeyboardProps(
          mergeActionSurfaceProps({
            ...rest,
            'aria-pressed': pressed,
            onMouseUp: useJoinedEventHandler(
              onClick,
              disabled && selected === false ? undefined : triggerAndComplete,
            ),
            ref,
            role: 'button',
          }),
        )}
      />,
    ),
  )
})
