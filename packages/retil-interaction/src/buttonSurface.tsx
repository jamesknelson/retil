import React, { forwardRef, useMemo } from 'react'
import { useHasHydrated } from 'retil-hydration'

import {
  ActionSurfaceProps,
  ConnectActionSurface,
  splitActionSurfaceProps,
} from './actionSurface'
import { inHydratingSurface, inToggledSurface } from './defaultSurfaceSelectors'
import { useDisableableEventHandler } from './disableable'
import { useJoinedEventHandler } from './joinEventHandlers'

export interface ButtonSurfaceProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'aria-pressed' | 'role'>,
    ActionSurfaceProps {
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
  (props, ref) => {
    const isHydrating = !useHasHydrated()

    const [actionSurfaceProps, { onClick, onTrigger, pressed, ...rest }] =
      splitActionSurfaceProps(props)

    const handleClick = useJoinedEventHandler(
      onClick,
      useDisableableEventHandler(props.disabled, onTrigger),
    )

    const handleKeyDown = useDisableableEventHandler(
      props.disabled,
      useMemo(
        () =>
          !onTrigger
            ? undefined
            : (event: React.KeyboardEvent) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  onTrigger(event)
                  event.preventDefault()
                }
              },
        [onTrigger],
      ),
    )

    return (
      <ConnectActionSurface
        {...actionSurfaceProps}
        defaultSelectorOverrides={[
          [inToggledSurface, '[aria-pressed="true"]'],
          [inHydratingSurface, !!isHydrating],
        ]}
        mergeProps={{
          ...rest,
          onClick: handleClick,
          onKeyDown: handleKeyDown,
          ref,
        }}>
        {(props) => <div {...props} aria-pressed={pressed} role="button" />}
      </ConnectActionSurface>
    )
  },
)
