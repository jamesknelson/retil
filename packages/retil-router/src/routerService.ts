import { PrecachedSnapshot, createActionMap } from 'retil-history'
import {
  FusorUse,
  createState,
  fuse,
  getSnapshotPromise,
  subscribe,
} from 'retil-source'
import { createMemo } from 'retil-support'

import {
  RouterController,
  RouterFunction,
  RouterHistorySnapshot,
  RouterRequestService,
  RouterResponse,
  RouterService,
  RouterRouteSnapshot,
  RouterSnapshotExtension,
} from './routerTypes'
import { isRedirect, waitForResponse } from './routerUtils'

import { routeNormalize } from './routers/routeNormalize'

export interface RouterOptions<
  TContextSnapshot extends object,
  TRequestSnapshot extends RequestSnapshot = RequestSnapshot
> {
  basename?: string
  followRedirects?: boolean
  fuseContext?: (request: TRequestSnapshot, use: FusorUse) => TContextSnapshot
  maxRedirects?: number
  normalizePathname?: boolean
  requestService?: RequestService<TRequestSnapshot>
}

export function createRouter<
  Request extends RouterRouteSnapshot = RouterRouteSnapshot,
  Response extends RouterResponse = RouterResponse
>(
  router: RouterFunction<Request & RouterRequestExtension, Response>,
  options: RouterOptions<Request, Response> = {},
): RouterService<Request, Response> {
  const {
    followRedirects = true,
    maxRedirects = 5,
    normalizePathname = true,
    initialSnapshot,
  } = options
  const normalizedRouter = normalizePathname ? routeNormalize(router) : router
  const [requestSource, requestController] = inputService

  const precachingActions = createActionMap<{
    promise: Promise<RouterRouteSnapshot<Request & PrecachedSnapshot, Response>>
    done: boolean
  }>()
  const precachedActions = new Map<
    symbol,
    RouterRouteSnapshot<Request & PrecachedSnapshot, Response>
  >()
  const precacheUnsubscribes = new Set<() => void>()

  const contextMemo = createMemo<
    RouterRouteSnapshot<Request & MaybePrecachedContext, Response>
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

  const source = fuse<RouterRouteSnapshot<Request, Response>>((use) => {
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
      request.precacheKey && precachedActions.get(request.precacheKey)

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

  const createSnapshot = <R extends Request & MaybePrecachedContext>(
    request: R,
  ): RouterRouteSnapshot<R, Response> => {
    const response: Response = {
      head: [] as any[],
      headers: {},
      pendingSuspenses: [] as PromiseLike<any>[],
    } as Response

    response.redirect = redirect.bind(null, response)

    const snapshot: RouterRouteSnapshot<R, Response> = {
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
    ): Promise<RouterRouteSnapshot<Request & PrecachedSnapshot, Response>> {
      // TODO: once request precache cancellation on change is implemented,
      // cache this so that we don't end up precaching the same action twice.
      const precachedRouterRequest = await requestController.precache(action)
      const precachedSnapshot = createSnapshot(precachedRouterRequest)
      await waitForResponse(precachedSnapshot.response)
      precachedActions.set(
        precachedRouterRequest.precacheKey,
        precachedSnapshot,
      )
      return precachedSnapshot
    },
  }

  return [source, controller]
}

export interface GetRouteOptions {
  normalizePathname?: boolean
}

export async function getInitialSnapshot<
  Request extends RouterRouteSnapshot = RouterRouteSnapshot,
  Response extends RouterResponse = RouterResponse
>(
  router: RouterFunction<Request, Response>,
  request: Request,
  options: GetRouteOptions = {},
): Promise<RouterRouteSnapshot<Request, Response>> {
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
