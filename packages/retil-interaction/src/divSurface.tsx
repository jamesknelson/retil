import React, { forwardRef } from 'react'

import { ConnectSurface, SurfaceProps, splitSurfaceProps } from './surface'

export interface DivSurfaceProps
  extends SurfaceProps,
    React.HTMLAttributes<HTMLDivElement> {}

export const DivSurface = forwardRef<HTMLDivElement, DivSurfaceProps>(
  (props, ref) => {
    const [surfaceProps, divProps] = splitSurfaceProps(props)

    return (
      <ConnectSurface {...surfaceProps} mergeProps={{ ...divProps, ref }}>
        {(props) => <div {...props} />}
      </ConnectSurface>
    )
  },
)
