import React, { forwardRef } from 'react'

import {
  SurfaceController,
  SurfaceProps,
  splitSurfaceProps,
} from './surfaceController'

export interface AnchorSurfaceProps
  extends SurfaceProps,
    React.AnchorHTMLAttributes<HTMLAnchorElement> {}

export const AnchorSurface = forwardRef<HTMLAnchorElement, AnchorSurfaceProps>(
  (props, ref) => {
    const [surfaceProps, { onClick, ...anchorProps }] = splitSurfaceProps(props)

    return (
      // Pass onClick to the <SurfaceController> instead of the <a>, to ensure
      // that it won't be called if the controller is disabled.
      <SurfaceController onClick={onClick} {...surfaceProps}>
        {(connect) =>
          connect(
            // eslint-disable-next-line jsx-a11y/anchor-has-content
            <a ref={ref} {...anchorProps} />,
          )
        }
      </SurfaceController>
    )
  },
)
