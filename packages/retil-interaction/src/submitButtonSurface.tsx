import React, { forwardRef } from 'react'
import { useHasHydrated } from 'retil-hydration'
import { preventDefaultEventHandler } from 'retil-support'

import {
  ActionSurfaceOptions,
  splitActionSurfaceOptions,
  useActionSurfaceConnector,
} from './actionSurface'
import { inHydratingSurface } from './defaultSurfaceSelectors'
import { useJoinedEventHandler } from './joinEventHandlers'
import { mergeOverrides } from './surfaceSelector'

export interface SubmitButtonSurfaceProps
  // Note that we've removed "type", as we don't want to support submit
  // buttons. They behave differently, so they deserve a separate surface.
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'>,
    ActionSurfaceOptions {
  enableBeforeHydration?: boolean
}

export const SubmitButtonSurface = forwardRef<
  HTMLButtonElement,
  SubmitButtonSurfaceProps
>((props, ref) => {
  const [actionSurfaceOptions, { enableBeforeHydration, onClick, ...rest }] =
    splitActionSurfaceOptions(props)

  // By default, we'll disable the form during hydration to prevent accidental
  // submits. To enable the form anyway, pass an `enableBeforeHydration` prop.
  const isHydrating = !useHasHydrated() && !enableBeforeHydration

  const [actionSurfaceState, mergeActionSurfaceProps, provideActionSurface] =
    useActionSurfaceConnector({
      ...actionSurfaceOptions,
      overrideSelectors: mergeOverrides(
        [[inHydratingSurface, !!isHydrating]],
        actionSurfaceOptions.overrideSelectors,
      ),
    })

  const handleClick = useJoinedEventHandler(
    onClick,
    actionSurfaceState.disabled ? preventDefaultEventHandler : undefined,
  )

  return provideActionSurface(
    <button
      {...mergeActionSurfaceProps({
        ...rest,
        onClick: handleClick,
        ref,
      })}
      // Disable the form until the app has hydrated and we're able to
      // programatically disable the form if required.
      disabled={isHydrating}
      type="submit"
    />,
  )
})
