import { useCallback, useEffect, useMemo } from 'react'
import { createHref } from 'retil-history'

import { useResolveRoute } from './useResolveRoute'
import { useNavigate } from './useNavigate'
import { usePrefetch } from './usePrefetch'
import { RouterAction } from '../routerTypes'

export interface UseLinkOptions {
  disabled?: boolean
  replace?: boolean
  prefetchOn?: 'hover' | 'mount'
  state?: object
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
  onMouseEnter?: React.MouseEventHandler<HTMLAnchorElement>
}

export const useLink = (to: RouterAction, options: UseLinkOptions = {}) => {
  const {
    disabled,
    prefetchOn,
    replace,
    state,
    onClick,
    onMouseEnter,
  } = options
  const navigate = useNavigate()
  const prefetch = usePrefetch()
  const action = useResolveRoute(to, state)

  const doPrefetch = useMemo(() => {
    let hasPrefetched = false

    return () => {
      if (!hasPrefetched && action && prefetch) {
        hasPrefetched = true
        prefetch(action)
      }
    }
  }, [action, prefetch])

  // Prefetch on mount if required, or if `prefetch` becomes `true`.
  useEffect(() => {
    if (prefetchOn === 'mount') {
      doPrefetch()
    }
  }, [prefetchOn, doPrefetch])

  let handleMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (prefetchOn === 'hover') {
        if (onMouseEnter) {
          onMouseEnter(event)
        }

        if (disabled) {
          event.preventDefault()
          return
        }

        if (!event.defaultPrevented) {
          doPrefetch()
        }
      }
    },
    [disabled, doPrefetch, onMouseEnter, prefetchOn],
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
