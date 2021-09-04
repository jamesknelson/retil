import { useCallback, useEffect, useMemo, useRef } from 'react'
import { joinEventHandlers } from 'retil-support'

import { useNavController } from '../navContext'
import { NavAction } from '../navTypes'
import { createHref } from '../navUtils'

import { useNavResolver } from './useNavResolver'

export interface UseNavLinkPropsOptions {
  disabled?: boolean
  replace?: boolean
  precacheOn?: 'hover' | 'mount'
  state?: object
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
  onMouseEnter?: React.MouseEventHandler<HTMLAnchorElement>
  onMouseLeave?: React.MouseEventHandler<HTMLAnchorElement>
}

export const useNavLinkProps = (
  to: NavAction,
  options: UseNavLinkPropsOptions = {},
) => {
  const {
    disabled,
    precacheOn = 'hover',
    replace,
    state,
    onClick,
    onMouseEnter,
    onMouseLeave,
  } = options
  const { navigate, precache } = useNavController()
  const resolver = useNavResolver()
  const action = resolver(to, state)

  const releasePrecacheRef = useRef<undefined | (() => void)>(undefined)
  const doPrecache = useCallback(() => {
    if (releasePrecacheRef.current) {
      releasePrecacheRef.current()
      releasePrecacheRef.current = undefined
    }
    if (!disabled) {
      releasePrecacheRef.current = precache(action)
    }
  }, [action, disabled, precache])

  const doReleasePrecache = useCallback(() => {
    if (releasePrecacheRef.current) {
      releasePrecacheRef.current()
      releasePrecacheRef.current = undefined
    }
  }, [])

  // Prefetch on mount if required, or if `prefetch` becomes `true`.
  useEffect(() => {
    if (precacheOn === 'mount') {
      doPrecache()
    }
    return () => {
      if (releasePrecacheRef.current) {
        releasePrecacheRef.current()
      }
    }
  }, [doPrecache, precacheOn])

  const handleMouseEnter = useMemo(
    () =>
      joinEventHandlers(
        onMouseEnter,
        precacheOn === 'hover' ? doPrecache : undefined,
      ),
    [onMouseEnter, precacheOn, doPrecache],
  )
  const handleMouseLeave = useMemo(
    () =>
      joinEventHandlers(
        precacheOn === 'hover' ? doReleasePrecache : undefined,
        onMouseLeave,
      ),
    [onMouseLeave, precacheOn, doReleasePrecache],
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
      } else if (onClick) {
        onClick(event)
      }
    },
    [disabled, action, navigate, onClick, replace],
  )

  return {
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    href: disabled ? undefined : action ? createHref(action) : (to as string),
  }
}
