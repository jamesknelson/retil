import { useCallback, useEffect, useMemo } from 'react'
import { createHref } from 'retil-history'

import { useResolve } from './useResolve'
import { useRouterController } from './useRouterController'
import { RouterAction, RouterHistoryState } from '../routerTypes'

export interface UseLinkOptions {
  disabled?: boolean
  replace?: boolean
  prefetch?: 'hover' | 'mount'
  state?: object
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
  onMouseEnter?: React.MouseEventHandler<HTMLAnchorElement>
}

export const useLink = <S extends RouterHistoryState = RouterHistoryState>(
  to: RouterAction<S>,
  options: UseLinkOptions,
) => {
  const { disabled, prefetch, replace, state, onClick, onMouseEnter } = options
  const controller = useRouterController()
  const action = useResolve(to, state)

  const doPrefetch = useMemo(() => {
    let hasPrefetched = false

    return () => {
      if (!hasPrefetched && action && controller) {
        hasPrefetched = true
        controller.prefetch(action).catch((e) => {
          console.warn(
            `A routing link tried to prefetch "${
              action!.pathname
            }", but the router was unable to fetch this path.`,
          )
        })
      }
    }
  }, [action, controller])

  // Prefetch on mount if required, or if `prefetch` becomes `true`.
  useEffect(() => {
    if (prefetch === 'mount') {
      doPrefetch()
    }
  }, [prefetch, doPrefetch])

  let handleMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (prefetch === 'hover') {
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
    [disabled, doPrefetch, onMouseEnter, prefetch],
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
          controller.navigate(action, { replace })
        }
      }
    },
    [disabled, action, controller, onClick, replace],
  )

  return {
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    href: action ? createHref(action) : (to as string),
  }
}
