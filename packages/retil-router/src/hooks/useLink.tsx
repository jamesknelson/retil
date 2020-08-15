import { useCallback, useEffect, useMemo } from 'react'
import {
  HistoryAction,
  HistoryState,
  applyLocationAction,
  createHref,
} from 'retil-history'

import { useRouterController } from './useRouterController'
import { useRequest } from './useRequest'

export interface UseLinkOptions {
  disabled?: boolean
  replace?: boolean
  prefetch?: 'hover' | 'mount'
  state?: object
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
  onMouseEnter?: React.MouseEventHandler<HTMLAnchorElement>
}

export const useLink = <S extends HistoryState = HistoryState>(
  to: HistoryAction<S>,
  options: UseLinkOptions,
) => {
  const { disabled, prefetch, replace, state, onClick, onMouseEnter } = options
  const controller = useRouterController()
  const request = useRequest()
  const nextLocation = applyLocationAction(request, to, state)

  // Memoize the delta so we don't create new handler callbacks on every
  // render. This is important for this component, as its not unusual for there
  // to be hundreds of links on a page.
  const deps = [
    nextLocation?.pathname,
    nextLocation?.search,
    nextLocation?.hash,
    nextLocation?.state,
  ]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedDelta = useMemo(() => nextLocation, deps)

  const doPrefetch = useMemo(() => {
    let hasPrefetched = false

    return () => {
      if (!hasPrefetched && memoizedDelta && controller) {
        hasPrefetched = true
        controller.prefetch(memoizedDelta).catch((e) => {
          console.warn(
            `A routing link tried to prefetch "${
              memoizedDelta!.pathname
            }", but the router was unable to fetch this path.`,
          )
        })
      }
    }
  }, [memoizedDelta, controller])

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

        if (!event.defaultPrevented && memoizedDelta) {
          event.preventDefault()
          controller.navigate(memoizedDelta, { replace })
        }
      }
    },
    [disabled, memoizedDelta, controller, onClick, replace],
  )

  return {
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    href: nextLocation ? createHref(nextLocation) : (to as string),
  }
}
