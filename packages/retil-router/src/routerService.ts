import { createMemo } from 'retil-support'
import { createState, fuse, getSnapshotPromise } from 'retil-source'

import {
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

  const snapshotMemo = createMemo<RouterSnapshot<Request, Response>>()

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

    // There's no guarantee that a fusor function won't be run multiple times
    // for the same request, so let's memoize it.
    const snapshot = snapshotMemo(() => {
      const response: Response = {
        head: [] as any[],
        headers: {},
        pendingSuspenses: [] as PromiseLike<any>[],
      } as Response

      response.redirect = redirect.bind(null, response)

      return {
        content: normalizedRouter(request, response),
        response,
        request,
      }
    }, [request])

    if (!isRedirect(snapshot.response)) {
      redirectCounter = 0
    }

    return snapshot
  })

  const controller: RouterController = {
    block: requestController.block,
    // We don't wrap `navigate` in an `act()`, as we want in-progress results
    // to be immediately available so they can be handled by suspense.
    navigate: requestController.navigate,
    prefetch(action): void {
      // TODO: call `requestController.plan`, then create a snapshot using
      // the returned request and add it to cache.
      throw new Error('Unimplemented')
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
