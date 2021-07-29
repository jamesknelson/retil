import React, { forwardRef } from 'react'
import { useHasHydrated } from 'retil-hydration'
import { preventDefaultEventHandler } from 'retil-support'

import {
  ActionSurfaceProps,
  ConnectActionSurface,
  splitActionSurfaceProps,
} from './actionSurface'
import { inHydratingSurface } from './defaultSurfaceSelectors'
import { useDisabled } from './disableable'
import { useJoinedEventHandler } from './joinEventHandlers'

export interface SubmitButtonSurfaceProps
  // Note that we've removed "type", as we don't want to support submit
  // buttons. They behave differently, so they deserve a separate surface.
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'>,
    ActionSurfaceProps {
  enableBeforeHydration?: boolean
}

export const SubmitButtonSurface = forwardRef<
  HTMLButtonElement,
  SubmitButtonSurfaceProps
>((props, ref) => {
  const [focusExtensionProps, { enableBeforeHydration, onClick, ...rest }] =
    splitActionSurfaceProps(props)

  // Don't submit the form if the button is disabled.
  const disabled = useDisabled(props.disabled)
  const handleClick = useJoinedEventHandler(
    onClick,
    disabled ? preventDefaultEventHandler : undefined,
  )

  // By default, we'll disable the form during hydration to prevent accidental
  // submits. To enable the form anyway, pass an `enableBeforeHydration` prop.
  const isHydrating = !useHasHydrated() && !enableBeforeHydration

  return (
    <ConnectActionSurface
      {...focusExtensionProps}
      defaultSelectorOverrides={[[inHydratingSurface, !!isHydrating]]}
      mergeProps={{
        ...rest,
        onClick: handleClick,
        ref,
      }}>
      {(props) => (
        <button
          {...props}
          type="submit"
          // Disable the form until the app has hydrated and we're able to
          // programatically disable the form if required.
          disabled={isHydrating}
        />
      )}
    </ConnectActionSurface>
  )
})
