import React, { forwardRef } from 'react'
import { NavAction, UseNavLinkPropsOptions, useNavLinkProps } from 'retil-nav'

import {
  ActionSurfaceOptions,
  splitActionSurfaceOptions,
  useActionSurfaceConnector,
} from './actionSurface'

export interface LinkSurfaceProps
  extends ActionSurfaceOptions,
    UseNavLinkPropsOptions,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  children: React.ReactNode
  href: NavAction
}

export const LinkSurface = forwardRef(
  (props: LinkSurfaceProps, anchorRef: React.Ref<HTMLAnchorElement>) => {
    const [actionSurfaceOptions, linkProps] = splitActionSurfaceOptions(props)
    const {
      href,
      onClick: onClickProp,
      onMouseEnter: onMouseEnterProp,
      precacheOn,
      replace,
      state,
      ...rest
    } = linkProps

    const [actionSurfaceState, mergeActionSurfaceProps, provideActionSurface] =
      useActionSurfaceConnector(actionSurfaceOptions)

    const navLinkProps = useNavLinkProps(href, {
      disabled: actionSurfaceState.disabled,
      onClick: onClickProp,
      onMouseEnter: onMouseEnterProp,
      precacheOn,
      replace,
      state,
    })

    // Don't handle events on links with a `target` prop.
    const onClick = props.target ? onClickProp : navLinkProps.onClick
    const onMouseEnter = props.target
      ? onMouseEnterProp
      : navLinkProps.onMouseEnter

    return provideActionSurface(
      // eslint-disable-next-line jsx-a11y/anchor-has-content
      <a
        {...mergeActionSurfaceProps({
          ...rest,
          ...navLinkProps,
          onClick,
          onMouseEnter,
          ref: anchorRef,
        })}
      />,
    )
  },
)
