import * as React from 'react'

import { useMatchRoute } from '../hooks/useMatchRoute'
import { UseLinkOptions, useLink } from '../hooks/useLink'
import { useResolveRoute } from '../hooks/useResolveRoute'
import { RouterAction } from '../routerTypes'

export interface LinkProps
  extends UseLinkOptions,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  active?: boolean
  activeClassName?: string
  activeStyle?: object
  children: React.ReactNode
  exact?: boolean
  ref?: React.Ref<HTMLAnchorElement>
  to: RouterAction
}

// Need to include this type definition, as the automatically generated one
// is incompatible with some versions of the react typings.
export const Link: React.FunctionComponent<LinkProps> = React.forwardRef(
  (props: LinkProps, anchorRef: React.Ref<HTMLAnchorElement>) => {
    const {
      active: activeProp,
      activeClassName = '',
      activeStyle = {},
      children,
      className = '',
      disabled,
      exact,
      onClick: onClickProp,
      onMouseEnter: onMouseEnterProp,
      prefetchOn,
      replace,
      state,
      style = {},
      to,
      ...rest
    } = props

    const action = useResolveRoute(to, state)

    const { onClick, onMouseEnter, href } = useLink(action, {
      disabled,
      onClick: onClickProp,
      onMouseEnter: onMouseEnterProp,
      prefetchOn,
      replace,
    })

    const activeMatch = useMatchRoute(action.pathname + (exact ? '' : '*'))
    const active = activeProp ?? activeMatch

    return (
      <a
        href={href}
        children={children}
        ref={anchorRef}
        className={`${className} ${active ? activeClassName : ''}`}
        style={{
          ...style,
          ...(active ? activeStyle : {}),
        }}
        {...rest}
        // Don't handle events on links with a `target` prop.
        onClick={props.target ? onClickProp : onClick}
        onMouseEnter={props.target ? onMouseEnterProp : onMouseEnter}
      />
    )
  },
)
