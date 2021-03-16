import React, { forwardRef } from 'react'

import { ConnectSurface, SurfaceProps, splitSurfaceProps } from './surface'

export interface ButtonSurfaceProps
  extends SurfaceProps,
    // Note that we've removed "type", as we don't want to support submit
    // buttons. They behave differently, so they deserve a separate surface.
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {}

// TODO:
// - ensure keyboard events are being handled correctly

export const ButtonSurface = forwardRef<HTMLButtonElement, ButtonSurfaceProps>(
  (props, ref) => {
    const [surfaceProps, buttonProps] = splitSurfaceProps(props)

    return (
      <ConnectSurface {...surfaceProps} mergeProps={{ ...buttonProps, ref }}>
        {(props) => <button {...props} type="button" />}
      </ConnectSurface>
    )
  },
)
