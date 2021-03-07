import React, { forwardRef } from 'react'

import {
  SurfaceController,
  SurfaceProps,
  splitSurfaceProps,
} from './surfaceController'

export interface DivSurfaceProps
  extends SurfaceProps,
    React.HTMLAttributes<HTMLDivElement> {}

export const DivSurface = forwardRef<HTMLDivElement, DivSurfaceProps>(
  (props, ref) => {
    const [surfaceProps, { onClick, ...divProps }] = splitSurfaceProps(props)

    return (
      // Pass onClick to the <SurfaceController> instead of the <a>, to ensure
      // that it won't be called if the controller is disabled.
      <SurfaceController onClick={onClick} {...surfaceProps}>
        {(connect) => connect(<div ref={ref} {...divProps} />)}
      </SurfaceController>
    )
  },
)
