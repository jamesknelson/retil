import React, { forwardRef } from 'react'
import {
  ConnectSurface,
  SurfaceProps,
  splitSurfaceProps,
} from 'retil-interaction'
import {
  NavAction,
  UseNavLinkOptions,
  useNavLink,
  useNavMatch,
  useNavResolve,
} from 'retil-nav'

export interface LinkProps
  extends SurfaceProps,
    UseNavLinkOptions,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  active?: boolean
  activeClassName?: string
  activeStyle?: object
  children: React.ReactNode
  exact?: boolean
  ref?: React.Ref<HTMLAnchorElement>
  to: NavAction
}

// Need to include this type definition, as the automatically generated one
// is incompatible with some versions of the react typings.
export const Link: React.FunctionComponent<LinkProps> = forwardRef(
  (props: LinkProps, anchorRef: React.Ref<HTMLAnchorElement>) => {
    const [surfaceProps, linkProps] = splitSurfaceProps(props)

    const {
      exact,
      onClick: onClickProp,
      onMouseEnter: onMouseEnterProp,
      precacheOn,
      replace,
      state,
      to,
      ...rest
    } = linkProps

    const action = useNavResolve(to, state)
    const activeMatch = useNavMatch(action.pathname + (exact ? '' : '*'))
    const activated = props.activated ?? activeMatch

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

    return (
      <ConnectSurface
        {...surfaceProps}
        activated={activated}
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
    )
  },
)
