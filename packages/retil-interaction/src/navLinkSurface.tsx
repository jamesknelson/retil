import React, { forwardRef, useCallback } from 'react'
import {
  NavAction,
  UseNavLinkOptions,
  useNavLink,
  useNavMatch,
  useNavResolve,
} from 'retil-nav'
import { ProvideDownSelector } from 'retil-style'

import { ConnectSurface, SurfaceProps, splitSurfaceProps } from './surface'

export interface NavLinkSurfaceProps
  extends SurfaceProps,
    UseNavLinkOptions,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  activeClassName?: string
  activeStyle?: object
  children: React.ReactNode
  exact?: boolean
  localLink?: boolean
  ref?: React.Ref<HTMLAnchorElement>
  to: NavAction
}

// Need to include this type definition, as the automatically generated one
// is incompatible with some versions of the react typings.
export const NavLinkSurface: React.FunctionComponent<NavLinkSurfaceProps> =
  forwardRef(
    (props: NavLinkSurfaceProps, anchorRef: React.Ref<HTMLAnchorElement>) => {
      const [surfaceProps, linkProps] = splitSurfaceProps(props)

      const {
        exact,
        onClick: onClickProp,
        onMouseEnter: onMouseEnterProp,
        localLink: localLinkProp,
        precacheOn,
        replace,
        state,
        to,
        ...rest
      } = linkProps

      const action = useNavResolve(to, state)
      const activeMatch = useNavMatch(action.pathname + (exact ? '' : '*'))
      const localLink = localLinkProp ?? activeMatch

      const navLinkProps = useNavLink(action, {
        disabled: surfaceProps.disabled,
        onClick: onClickProp,
        onMouseEnter: onMouseEnterProp,
        precacheOn,
        replace,
      })

      // Don't handle events on links with a `target` prop.
      const onClick = props.target ? onClickProp : navLinkProps.onClick
      const onMouseEnter = props.target
        ? onMouseEnterProp
        : navLinkProps.onMouseEnter

      const downSelect = useCallback(
        (highSelector: string) =>
          highSelector === 'localLink' ? localLink : undefined,
        [localLink],
      )

      return (
        <ProvideDownSelector downSelect={downSelect}>
          <ConnectSurface
            {...surfaceProps}
            mergeProps={{
              ...rest,
              ...navLinkProps,
              ref: anchorRef,
              onClick,
              onMouseEnter,
            }}>
            {(props) => (
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              <a {...props} />
            )}
          </ConnectSurface>
        </ProvideDownSelector>
      )
    },
  )
