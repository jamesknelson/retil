import React, { forwardRef } from 'react'
import { useIsHydrating } from 'retil-hydration'

import {
  ActionSurfaceProps,
  ConnectActionSurface,
  splitActionSurfaceProps,
} from './actionSurface'
import { inHydratingSurface, inToggledSurface } from './defaultSurfaceSelectors'
import { useDisableableEventHandler } from './disableable'
import { useJoinedEventHandler } from './joinEventHandlers'

export interface ButtonSurfaceProps
  // Note that we've removed "type", as we don't want to support submit
  // buttons. They behave differently, so they deserve a separate surface.
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'role' | 'type'>,
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

export const ButtonSurface = forwardRef<HTMLButtonElement, ButtonSurfaceProps>(
  (props, ref) => {
    const isHydrating = useIsHydrating()

    const [actionSurfaceProps, { onClick, onTrigger, pressed, ...rest }] =
      splitActionSurfaceProps(props)

    const handleClick = useJoinedEventHandler(
      onClick,
      useDisableableEventHandler(props.disabled, onTrigger),
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
          ref,
        }}>
        {(props) => <button {...props} aria-pressed={pressed} type="button" />}
      </ConnectActionSurface>
    )
  },
)
