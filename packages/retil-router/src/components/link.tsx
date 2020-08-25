import * as React from 'react'

import { useMatch } from '../hooks/useMatch'
import { UseLinkOptions, useLink } from '../hooks/useLink'
import { useResolve } from '../hooks/useResolve'
import { RouterHistoryState, RouterAction } from '../routerTypes'

export interface LinkProps<S extends RouterHistoryState = RouterHistoryState>
  extends UseLinkOptions,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  active?: boolean
  activeClassName?: string
  activeStyle?: object
  children: React.ReactNode
  exact?: boolean
  ref?: React.Ref<HTMLAnchorElement>
  to: RouterAction<S>
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
      prefetch,
      replace,
      state,
      style = {},
      to,
      ...rest
    } = props

    const action = useResolve(to, state)

    const { onClick, onMouseEnter, href } = useLink(action, {
      disabled,
      onClick: onClickProp,
      onMouseEnter: onMouseEnterProp,
      prefetch,
      replace,
    })

    const activeMatch = useMatch(action.pathname + (exact ? '' : '*'))
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
