import { useRef } from 'react'
import { useBoundaryLayoutEffect } from 'retil-boundary'
import { useEnv, useWaitForStableMount } from 'retil-mount'

import { NavEnv } from '../navTypes'

export interface UseNavScrollerOptions<Env extends NavEnv> {
  getShouldScroll?: (prevEnv: Env, nextEnv: Env) => boolean
  scrollToLocation?: (env: Env) => boolean
}

let hasHydrated = false

export function useNavScroller<Env extends NavEnv = NavEnv>(
  options: UseNavScrollerOptions<Env> = {},
) {
  const {
    getShouldScroll = defaultGetShouldScroll,
    scrollToLocation: scrollToRequest = defaultScrollToRequest,
  } = options

  const env = useEnv() as Env
  const waitForStableMount = useWaitForStableMount()
  const scrollRequestRef = useRef(env)

  if (env !== scrollRequestRef.current) {
    const nextEnv = env
    const prevEnv = scrollRequestRef.current
    const shouldScroll = getShouldScroll(prevEnv, nextEnv)

    if (shouldScroll) {
      scrollRequestRef.current = env

      try {
        // Save the scroll position before the update actually occurs
        sessionStorage.setItem(
          '__retil_scroll_' + prevEnv.nav.key!,
          JSON.stringify({ x: window.pageXOffset, y: window.pageYOffset }),
        )
      } catch {}
    }
  }

  const scrollRequest = scrollRequestRef.current

  useBoundaryLayoutEffect(() => {
    let unmounted = false

    if (!hasHydrated) {
      window.history.scrollRestoration = 'manual'
      hasHydrated = true
    } else {
      const didScroll = scrollToRequest(scrollRequest)
      if (!didScroll) {
        waitForStableMount().then(() => {
          if (!unmounted) {
            scrollToRequest(scrollRequest)
          }
        })
      }
    }

    return () => {
      unmounted = true
    }
  }, [scrollRequest])
}

const defaultGetShouldScroll = (prev: NavEnv, next: NavEnv) =>
  prev.nav.hash !== next.nav.hash || prev.nav.pathname !== next.nav.pathname

export const defaultScrollToRequest = (env: NavEnv) => {
  // TODO: if scrolling to a hash within the same page, ignore
  // the scroll history and just scroll directly there

  let scrollCoords: { x: number; y: number }
  try {
    scrollCoords = JSON.parse(
      sessionStorage.getItem('__retil_scroll_' + env.nav.key)!,
    ) || { x: 0, y: 0 }
  } catch {
    if (!env.nav.hash) {
      scrollCoords = { x: 0, y: 0 }
    } else {
      const id = document.getElementById(env.nav.hash.slice(1))
      if (!id) {
        return false
      }
      const { top, left } = id.getBoundingClientRect()
      scrollCoords = {
        x: left + window.pageXOffset,
        y: top + window.pageYOffset,
      }
    }
  }

  // Check that the element we want to scroll to is in view
  const maxScrollTop = Math.max(
    0,
    document.documentElement.scrollHeight -
      document.documentElement.clientHeight,
  )
  const maxScrollLeft = Math.max(
    0,
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )

  if (scrollCoords.x > maxScrollLeft || scrollCoords.y > maxScrollTop) {
    return false
  }

  window.scroll(scrollCoords.x, scrollCoords.y)

  return true
}
