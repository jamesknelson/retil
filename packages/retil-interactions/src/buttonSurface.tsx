import React, { forwardRef } from 'react'

import {
  SurfaceController,
  SurfaceProps,
  splitSurfaceProps,
} from './surfaceController'

export interface ButtonSurfaceProps
  extends SurfaceProps,
    // Note that we've removed "type", as we don't want to support submit
    // buttons. They behave differently, so they deserve a separate surface.
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'> {
  onPress?: (event: React.MouseEvent) => void
}

// TODO:
// - ensure keyboard events are being handled correctly

export const ButtonSurface = forwardRef<HTMLButtonElement, ButtonSurfaceProps>(
  (props, ref) => {
    const [surfaceProps, { onPress, ...buttonProps }] = splitSurfaceProps(props)

    return (
      <SurfaceController
        {...surfaceProps}
        // Pass onPress directly to SurfaceController as onClick, so that
        // the handler will be disabled correctly, despite us not passing
        // a `disabled` prop to the button itself.
        onClick={onPress}>
        {(connect) =>
          connect(<button ref={ref} type="button" {...buttonProps} />)
        }
      </SurfaceController>
    )
  },
)
