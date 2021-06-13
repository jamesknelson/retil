import React, { forwardRef, useCallback } from 'react'
import {
  NavAction,
  UseNavLinkPropsOptions,
  useNavLinkProps,
  useNavMatch,
  useNavResolve,
} from 'retil-nav'
import { ProvideDownSelector } from 'retil-style'
import { joinClassNames } from 'retil-support'

import { ConnectSurface, SurfaceProps, splitSurfaceProps } from './surface'

export interface NavLinkSurfaceProps
  extends SurfaceProps,
    UseNavLinkPropsOptions,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  localLink?: boolean
  localLinkClassName?: string
  localLinkStyle?: object
  children: React.ReactNode
  exact?: boolean
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
        className,
        exact,
        localLink: localLinkProp,
        localLinkClassName,
        localLinkStyle,
        onClick: onClickProp,
        onMouseEnter: onMouseEnterProp,
        precacheOn,
        replace,
        state,
        style,
        to,
        ...rest
      } = linkProps

      const resolve = useNavResolve()
      const match = useNavMatch()
      const location = resolve(to, state)
      const localLink =
        localLinkProp ?? match(location.pathname + (exact ? '' : '*'))

      const navLinkProps = useNavLinkProps(to, {
        disabled: surfaceProps.disabled,
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

      const downSelect = useCallback(
        (highSelector: string) =>
          highSelector === 'localLink' ? localLink : undefined,
        [localLink],
      )

      const injectedLocalLinkStyle = localLink && localLinkStyle

      return (
        <ProvideDownSelector downSelect={downSelect}>
          <ConnectSurface
            {...surfaceProps}
            mergeProps={{
              ...rest,
              ...navLinkProps,
              className: joinClassNames(
                className,
                localLink && localLinkClassName,
              ),
              onClick,
              onMouseEnter,
              ref: anchorRef,
              style:
                style || injectedLocalLinkStyle
                  ? {
                      ...style,
                      ...injectedLocalLinkStyle,
                    }
                  : undefined,
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
