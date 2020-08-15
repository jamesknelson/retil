import * as React from 'react'
import { HistoryState, HistoryAction } from 'retil-history'

import { useIsActive } from '../hooks/useIsActive'
import { UseLinkOptions, useLink } from '../hooks/useLink'

export interface LinkProps<S extends HistoryState = HistoryState>
  extends UseLinkOptions,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  active?: boolean
  activeClassName?: string
  activeStyle?: object
  children: React.ReactNode
  exact?: boolean
  ref?: React.Ref<HTMLAnchorElement>
  to: HistoryAction<S>
}

// Need to include this type definition, as the automatically generated one
// is incompatible with some versions of the react typings.
export const Link: React.FunctionComponent<LinkProps> = React.forwardRef(
  (props: LinkProps, anchorRef: React.Ref<HTMLAnchorElement>) => {
    let {
      active,
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

    let { onClick, onMouseEnter, href } = useLink(to, {
      disabled,
      onClick: onClickProp,
      onMouseEnter: onMouseEnterProp,
      prefetch,
      replace,
      state,
    })

    let actualActive = useIsActive(to, { exact: !!exact })
    if (active === undefined) {
      active = actualActive
    }

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
