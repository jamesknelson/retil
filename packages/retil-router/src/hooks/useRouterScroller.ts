import { useLayoutEffect, useRef } from 'react'
import { noop } from 'retil-support'

import { RouterRequest, RouterState } from '../routerTypes'

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
  getRequestHash?: (request: Request) => string
  getRequestKey?: (request: Request) => string
  router?: RouterState<Request>
  scrollToHashOrTop?: (hash: string | undefined | null) => boolean
}

export function useRouterScroller<
  Request extends RouterRequest = RouterRequest
>(options: UseRouterScrollerOptions<Request> = {}) {
  const {
    getRequestHash = defaultGetRequestHash,
    getRequestKey = defaultGetRequestKey,
    router,
    scrollToHashOrTop = defaultScrollToHashOrTop,
  } = options

  const request = useRouterRequest(router?.request)
  const waitUntilNavigationCompletes = useWaitUntilNavigationCompletes(
    router?.waitUntilNavigationCompletes,
  )

  useClientSideOnlyLayoutEffect(() => {
    // Use custom scroll restoration
    window.history.scrollRestoration = 'manual'
  }, [])

  let lastRequestRef = useRef<Request>(request)
  useClientSideOnlyLayoutEffect(() => {
    let unmounted = false

    let nextRequest = request
    let prevRequest = lastRequestRef.current
    lastRequestRef.current = request

    // FIXME: we can't just do this at the top level,
    // because due to concurrent mode (yay concurrent mode),
    // it's possible that a higher level route containing
    // the layout will render before the actual new content
    // renders. So this should

    const hasPathChanged =
      prevRequest && getRequestKey(nextRequest) !== getRequestKey(prevRequest)
    const hasHashChanged =
      prevRequest && getRequestHash(nextRequest) !== getRequestHash(prevRequest)

    if (hasPathChanged || hasHashChanged) {
      const didScroll = scrollToHashOrTop(getRequestHash(nextRequest))
      if (!didScroll && !hasPathChanged && hasHashChanged) {
        waitUntilNavigationCompletes().then(() => {
          if (!unmounted) {
            scrollToHashOrTop(nextRequest.hash)
          }
        })
      }
    }

    return () => {
      unmounted = true
    }
  }, [request])
}

const defaultGetRequestHash = (request: RouterRequest) => request.hash
const defaultGetRequestKey = (request: RouterRequest) => request.pathname

export const defaultScrollToHashOrTop = (hash: string | undefined | null) => {
  if (hash) {
    let id = document.getElementById(hash.slice(1))
    if (id) {
      let { top, left } = id.getBoundingClientRect()
      window.scroll(left + window.pageXOffset, top + window.pageYOffset)
      return true
    }
    return false
  } else {
    window.scroll(0, 0)
    return true
  }
}
