import { useRef } from 'react'
import { useBoundaryLayoutEffect } from 'retil-boundary'
import { useEnv, useWaitForStableMount } from 'retil-mount'
import { noop } from 'retil-support'

import { NavEnv } from '../navTypes'

export interface ScrollCoords {
  top: number
  left: number
}

export interface UseNavScrollerOptions<Env extends NavEnv> {
  getShouldScroll?: (prevEnv: Env, nextEnv: Env) => boolean
  getScrollCoords?: (env: Env) => ScrollCoords | null
  scrollTo?: (coords: ScrollCoords) => void | Promise<void>
}

let hasHydrated = false

const defaultScrollTo = typeof window !== 'undefined' ? window.scrollTo : noop

export function useBoundaryNavScroller<Env extends NavEnv = NavEnv>(
  options: UseNavScrollerOptions<Env> = {},
) {
  const {
    getShouldScroll = defaultGetShouldScroll,
    getScrollCoords = defaultGetScrollCoords,
    scrollTo = defaultScrollTo,
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
      const coords = getScrollCoords(scrollRequest)
      if (coords) {
        scrollTo(coords)
      } else {
        waitForStableMount().then(() => {
          if (!unmounted) {
            const coords = getScrollCoords(scrollRequest)
            if (coords) {
              scrollTo(coords)
            }
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

export const defaultGetScrollCoords = (env: NavEnv): ScrollCoords | null => {
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
        return null
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
    return null
  }

  return { left: scrollCoords.x, top: scrollCoords.y }
}
