import React, { forwardRef } from 'react'

import { ConnectSurface, SurfaceProps, splitSurfaceProps } from './surface'

export interface AnchorSurfaceProps
  extends SurfaceProps,
    React.AnchorHTMLAttributes<HTMLAnchorElement> {}

export const AnchorSurface = forwardRef<HTMLAnchorElement, AnchorSurfaceProps>(
  (props, ref) => {
    const [surfaceProps, anchorProps] = splitSurfaceProps(props)

    return (
      // Pass onClick to the <SurfaceController> instead of the <a>, to ensure
      // that it won't be called if the controller is disabled.
      <ConnectSurface {...surfaceProps} mergeProps={{ ...anchorProps, ref }}>
        {(props) => (
          // eslint-disable-next-line jsx-a11y/anchor-has-content
          <a {...props} />
        )}
      </ConnectSurface>
    )
  },
)
