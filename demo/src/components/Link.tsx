import React, { forwardRef, useCallback, useContext } from 'react'

import { NavigationContext } from '../context'

export interface LinkProps extends React.ComponentProps<'a'> {
  href: string
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, target, onClick, ...rest }, ref) => {
    const { navigate } = useContext(NavigationContext)
    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (
          target ||
          event.shiftKey ||
          event.ctrlKey ||
          event.altKey ||
          event.metaKey
        ) {
          return
        }
        if (onClick) {
          onClick(event)
        }
        if (event.defaultPrevented) {
          return
        }
        event.preventDefault()
        navigate(href)
      },
      [href, navigate, target, onClick],
    )

    return (
      <a href={href} ref={ref} onClick={handleClick} target={target} {...rest}>
        {rest.children}
      </a>
    )
  },
)
