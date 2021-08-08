/**
 * Anchors cannot be disabled or have delegated focus, as their behavior is
 * handled natively by the browser, even before the page is hydrated – and
 * there is no native way to disable them or delegate their focus.
 */

import React, { forwardRef } from 'react'

import {
  ActionSurfaceOptions,
  splitActionSurfaceOptions,
  useActionSurfaceConnector,
} from './actionSurface'

export interface AnchorSurfaceProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    ActionSurfaceOptions {}

export const AnchorSurface = forwardRef<HTMLAnchorElement, AnchorSurfaceProps>(
  (props, ref) => {
    const [actionSurfaceOptions, rest] = splitActionSurfaceOptions(props)
    const [actionSurfaceState, mergeActionSurfaceProps, provideActionSurface] =
      useActionSurfaceConnector(actionSurfaceOptions)

    return provideActionSurface(
      // eslint-disable-next-line jsx-a11y/anchor-has-content
      <a
        {...mergeActionSurfaceProps({
          ...rest,
          ref,
          // <a> tags can't be disabled during SSR, but are still rendered
          // before the page becomes active, so if necessary we'll disable
          // them by removing the `href`.
          href: actionSurfaceState.disabled ? undefined : props.href,
        })}
      />,
    )
  },
)
