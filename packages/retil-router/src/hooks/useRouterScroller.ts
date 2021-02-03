import { useLayoutEffect, useRef } from 'react'
import { noop } from 'retil-support'

import { RouterRequest } from '../routerTypes'

import { useRouterRequest } from './useRouterRequest'
import { useWaitUntilNavigationCompletes } from './useWaitUntilNavigationCompletes'

// React currently throws a warning when using useLayoutEffect on the server.
// To get around it, we can conditionally useEffect on the server (no-op) and
// useLayoutEffect in the browser. We need useLayoutEffect because we want
// `connect` to perform sync updates to a ref to save the latest props after
// a render is actually committed to the DOM.
const useClientSideOnlyLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : noop

export interface UseRouterScrollerOptions<
  Request extends RouterRequest = RouterRequest
> {
  // Useful for nested layouts with suspense wrappers, where you might want
  // to leave scrolling to be handled by a child component when the inner
  // suspense finishes loading.
  getWillChildHandleScroll?: () => boolean
  getShouldScroll?: (prevRequest: Request, nextRequest: Request) => boolean
  scrollToRequest?: (request: Request) => boolean
}

let hasHydrated = false

export function useRouterScroller<
  Request extends RouterRequest = RouterRequest
>(options: UseRouterScrollerOptions<Request> = {}) {
  const {
    getWillChildHandleScroll,
    getShouldScroll = defaultGetShouldScroll,
    scrollToRequest = defaultScrollToRequest,
  } = options

  const request = useRouterRequest<Request>()
  const waitUntilNavigationCompletes = useWaitUntilNavigationCompletes()
  const scrollRequestRef = useRef(request)

  if (request !== scrollRequestRef.current) {
    const nextRequest = request
    const prevRequest = scrollRequestRef.current
    const shouldScroll = getShouldScroll(prevRequest, nextRequest)

    if (shouldScroll) {
      scrollRequestRef.current = request

      try {
        // Save the scroll position before the update actually occurs
        sessionStorage.setItem(
          '__retil_scroll_' + prevRequest.key!,
          JSON.stringify({ x: window.pageXOffset, y: window.pageYOffset }),
        )
      } catch {}
    }
  }

  const scrollRequest = scrollRequestRef.current

  useClientSideOnlyLayoutEffect(() => {
    let unmounted = false

    if (!getWillChildHandleScroll || !getWillChildHandleScroll()) {
      if (!hasHydrated) {
        window.history.scrollRestoration = 'manual'
        hasHydrated = true
      } else {
        const didScroll = scrollToRequest(scrollRequest)
        if (!didScroll) {
          waitUntilNavigationCompletes().then(() => {
            if (
              !unmounted &&
              (!getWillChildHandleScroll || !getWillChildHandleScroll())
            ) {
              scrollToRequest(scrollRequest)
            }
          })
        }
      }
    }

    return () => {
      unmounted = true
    }
  }, [scrollRequest])
}

const defaultGetShouldScroll = (prev: RouterRequest, next: RouterRequest) =>
  prev.hash !== next.hash || prev.pathname !== next.pathname

export const defaultScrollToRequest = (request: RouterRequest) => {
  // TODO: if scrolling to a hash within the same page, ignore
  // the scroll history and just scroll directly there

  let scrollCoords: { x: number; y: number }
  try {
    scrollCoords = JSON.parse(
      sessionStorage.getItem('__retil_scroll_' + request.key)!,
    ) || { x: 0, y: 0 }
  } catch {
    if (!request.hash) {
      scrollCoords = { x: 0, y: 0 }
    } else {
      const id = document.getElementById(request.hash.slice(1))
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
