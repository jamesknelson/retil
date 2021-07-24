import React, { forwardRef } from 'react'
import { NavAction, UseNavLinkPropsOptions, useNavLinkProps } from 'retil-nav'

import {
  ConnectActionSurface,
  ActionSurfaceProps,
  splitActionSurfaceProps,
} from './actionSurface'
import { useDisabled } from './disableable'

export interface LinkSurfaceProps
  extends ActionSurfaceProps,
    UseNavLinkPropsOptions,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  children: React.ReactNode
  href: NavAction
}

// Need to include this type definition, as the automatically generated one
// is incompatible with some versions of the react typings.
export const LinkSurface: React.FunctionComponent<LinkSurfaceProps> =
  forwardRef(
    (props: LinkSurfaceProps, anchorRef: React.Ref<HTMLAnchorElement>) => {
      const [actionSurfaceProps, linkProps] = splitActionSurfaceProps(props)
      const {
        href,
        onClick: onClickProp,
        onMouseEnter: onMouseEnterProp,
        precacheOn,
        replace,
        state,
        ...rest
      } = linkProps

      // Ensure we pick up any default value for `disabled` from context
      const disabled = useDisabled(props.disabled)

      const navLinkProps = useNavLinkProps(href, {
        disabled,
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

      return (
        <ConnectActionSurface
          {...actionSurfaceProps}
          mergeProps={{
            ...rest,
            ...navLinkProps,
            onClick,
            onMouseEnter,
            ref: anchorRef,
          }}>
          {(props) => (
            // eslint-disable-next-line jsx-a11y/anchor-has-content
            <a {...props} />
          )}
        </ConnectActionSurface>
      )
    },
  )
