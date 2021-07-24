/**
 * Anchors cannot be disabled or have delegated focus, as their behavior is
 * handled natively by the browser, even before the page is hydrated – and
 * there is no native way to disable them or delegate their focus.
 */

import React, { forwardRef } from 'react'

import {
  ActionSurfaceProps,
  ConnectActionSurface,
  splitActionSurfaceProps,
} from './actionSurface'
import { useDisabled } from './disableable'

export interface AnchorSurfaceProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    ActionSurfaceProps {}

export const AnchorSurface = forwardRef<HTMLAnchorElement, AnchorSurfaceProps>(
  (props, ref) => {
    const [actionSurfaceProps, rest] = splitActionSurfaceProps(props)
    const disabled = useDisabled(props.disabled)

    return (
      <ConnectActionSurface
        {...actionSurfaceProps}
        mergeProps={{
          ...rest,
          ref,
        }}>
        {(props) => (
          // eslint-disable-next-line jsx-a11y/anchor-has-content
          <a
            {...props}
            // <a> tags can't be disabled during SSR, but are still rendered
            // before the page becomes active, so if necessary we'll disable
            // them by removing the `href`.
            href={disabled ? undefined : props.href}
          />
        )}
      </ConnectActionSurface>
    )
  },
)
