import { createActionMap } from 'retil-history'
import { createState, fuse, getSnapshotPromise, subscribe } from 'retil-source'
import { createMemo } from 'retil-support'

import {
  MaybePrecachedRequest,
  PrecachedRequest,
  RouterController,
  RouterFunction,
  RouterRequest,
  RouterRequestExtension,
  RouterRequestService,
  RouterResponse,
  RouterService,
  RouterSnapshot,
} from './routerTypes'
import { isRedirect, waitForResponse } from './routerUtils'

import { routeNormalize } from './routers/routeNormalize'

export interface RouterOptions<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
> {
  followRedirects?: boolean
  maxRedirects?: number
  normalizePathname?: boolean
  initialSnapshot?: RouterSnapshot<Request, Response>
}

export function createRouter<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
>(
  router: RouterFunction<Request & RouterRequestExtension, Response>,
  requestService: RouterRequestService<Request>,
  options: RouterOptions<Request, Response> = {},
): RouterService<Request, Response> {
  const {
    followRedirects = true,
    maxRedirects = 5,
    normalizePathname = true,
    initialSnapshot,
  } = options
  const normalizedRouter = normalizePathname ? routeNormalize(router) : router
  const [requestSource, requestController] = requestService

  const precachingActions = createActionMap<{
    promise: Promise<RouterSnapshot<Request & PrecachedRequest, Response>>
    done: boolean
  }>()
  const precachedActions = new Map<
    symbol,
    RouterSnapshot<Request & PrecachedRequest, Response>
  >()
  const precacheUnsubscribes = new Set<() => void>()

  const contextMemo = createMemo<
    RouterSnapshot<Request & MaybePrecachedRequest, Response>
  >()

  let initialRequest: Request | null = null

  let redirectCounter = 0
  const redirect = async (
    response: Response,
    statusOrURL: number | string,
    url?: string,
  ): Promise<void> => {
    const location = url || (statusOrURL as string)

    response.headers.Location = location
    response.status = typeof statusOrURL === 'number' ? statusOrURL : 302

    if (followRedirects) {
      if (++redirectCounter > maxRedirects) {
        throw new Error('Possible redirect loop detected')
      }

      // Navigate in a microtask so that we don't cause any synchronous updates to
      // components listening to the history.
      await Promise.resolve()

      // Redirects should never be blocked, so we'll force immediate
      // navigation.
      await requestController.navigate(location, {
        force: true,
        replace: true,
      })
    }
  }

  const source = fuse<RouterSnapshot<Request, Response>>((use) => {
    const request = use(requestSource)

    // If an initial snapshot is provided, use it until a new request is
    // available.
    if (initialSnapshot && (!initialRequest || initialRequest === request)) {
      initialRequest = request
      return initialSnapshot
    }

    // TODO: signal an abort on any still precaching actions, and on any
    // currently working router.

    const precachedRouterSnapshot =
      request.precacheId && precachedActions.get(request.precacheId)

    // Clear our precache, as any change from now on should result in a new
    // request.
    precachedActions.clear()
    precachingActions.clear()
    precacheUnsubscribes.forEach((unsubscribe) => unsubscribe())
    precacheUnsubscribes.clear()

    // Memozie the snapshot by request, in case the fusor is re-run due to
    // a suspense.
    const snapshot = contextMemo(
      () => precachedRouterSnapshot || createSnapshot(request),
      [request],
    )

    return snapshot
  })

  const createSnapshot = <R extends Request & MaybePrecachedRequest>(
    request: R,
  ): RouterSnapshot<R, Response> => {
    const response: Response = {
      head: [] as any[],
      headers: {},
      pendingSuspenses: [] as PromiseLike<any>[],
    } as Response

    response.redirect = redirect.bind(null, response)

    const snapshot: RouterSnapshot<R, Response> = {
      content: normalizedRouter(request, response),
      response,
      request,
    }

    if (!isRedirect(snapshot.response)) {
      redirectCounter = 0
    }

    return snapshot
  }

  const controller: RouterController = {
    block: requestController.block,

    navigate: async (action, options) => {
      // If we're currently precaching this action, then wait until precaching
      // is complete before navigating, as otherwise we'll ignore the precache
      // and re-start the request from scratch.
      const currentlyPrecaching = precachingActions.get(action)
      if (currentlyPrecaching && !currentlyPrecaching.done) {
        let hasChanged = false

        // Cancel navigation if something else causes navigation in the
        // meantime.
        const unsubscribe = subscribe(requestSource, () => {
          hasChanged = true
        })
        await currentlyPrecaching
        unsubscribe()
        if (hasChanged) {
          return false
        }
      }

      return requestController.navigate(action, options)
    },

    async precache(
      action,
    ): Promise<RouterSnapshot<Request & PrecachedRequest, Response>> {
      // TODO: once request precache cancellation on change is implemented,
      // cache this so that we don't end up precaching the same action twice.
      const precachedRouterRequest = await requestController.precache(action)
      const precachedSnapshot = createSnapshot(precachedRouterRequest)
      await waitForResponse(precachedSnapshot.response)
      precachedActions.set(precachedRouterRequest.precacheId, precachedSnapshot)
      return precachedSnapshot
    },
  }

  return [source, controller]
}

export interface GetRouteOptions {
  normalizePathname?: boolean
}

export async function getInitialSnapshot<
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
>(
  router: RouterFunction<Request, Response>,
  request: Request,
  options: GetRouteOptions = {},
): Promise<RouterSnapshot<Request, Response>> {
  const [requestSource] = createState(request)
  const requestService = [requestSource, {} as any] as const
  const [routerSource] = createRouter<Request, Response>(
    router,
    requestService,
    {
      followRedirects: false,
      ...options,
    },
  )
  const snapshot = await getSnapshotPromise(routerSource)
  await waitForResponse(snapshot.response)
  return snapshot
}
