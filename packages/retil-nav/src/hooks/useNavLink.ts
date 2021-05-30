import { useCallback, useEffect } from 'react'

import { useNavController } from '../navContext'
import { NavAction } from '../navTypes'
import { createHref } from '../navUtils'

import { useNavResolve } from './useNavResolve'

export interface UseNavLinkOptions {
  disabled?: boolean
  replace?: boolean
  precacheOn?: 'hover' | 'mount'
  state?: object
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
  onMouseEnter?: React.MouseEventHandler<HTMLAnchorElement>
}

export const useNavLink = (to: NavAction, options: UseNavLinkOptions = {}) => {
  const { disabled, precacheOn, replace, state, onClick, onMouseEnter } =
    options
  const { navigate, precache } = useNavController()
  const action = useNavResolve(to, state)

  // Prefetch on mount if required, or if `prefetch` becomes `true`.
  useEffect(() => {
    if (precacheOn === 'mount') {
      return precache(action)
    }
  }, [action, precache, precacheOn])

  let handleMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (precacheOn === 'hover') {
        if (onMouseEnter) {
          onMouseEnter(event)
        }

        if (disabled) {
          event.preventDefault()
          return
        }

        if (!event.defaultPrevented) {
          const cancel = precache(action)
          setTimeout(cancel, 100)
        }
      }
    },
    [action, disabled, onMouseEnter, precache, precacheOn],
  )

  let handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      // Let the browser handle the event directly if:
      // - The user used the middle/right mouse button
      // - The user was holding a modifier key
      // - A `target` property is set (which may cause the browser to open the
      //   link in another tab)
      if (
        event.button === 0 &&
        !(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      ) {
        if (disabled) {
          event.preventDefault()
          return
        }

        if (onClick) {
          onClick(event)
        }

        if (!event.defaultPrevented && action) {
          event.preventDefault()
          navigate(action, { replace })
        }
      }
    },
    [disabled, action, navigate, onClick, replace],
  )

  return {
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    href: action ? createHref(action) : (to as string),
  }
}
