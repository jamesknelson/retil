import {
  HistoryRequest,
  HistoryService,
  applyLocationAction,
  createMemoryHistory,
  parseLocation,
} from 'retil-history'
import { fuse, getSnapshotPromise, getSnapshot } from 'retil-source'

import {
  RouterAction,
  RouterController,
  RouterFunction,
  RouterHistoryState,
  RouterRequest,
  RouterResponse,
  RouterService,
  RouterSnapshot,
  RouterState,
} from './routerTypes'
import { getNoopController, waitForMutablePromiseList } from './routerUtils'

import { routeNormalize } from './routers/routeNormalize'

export interface RouterOptions<
  Ext = {},
  S extends RouterHistoryState = RouterHistoryState
> {
  basename?: string
  followRedirects?: boolean
  maxRedirects?: number
  normalizePathname?: boolean
  transformRequest?: (request: RouterRequest<S>) => RouterRequest<S> & Ext
}

export function createRouter<
  Ext = {},
  S extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
>(
  router: RouterFunction<RouterRequest<S> & Ext, Response>,
  history: HistoryService<S>,
  options: RouterOptions<Ext, S>,
): RouterService<Ext, S, Response> {
  let redirectCounter = 0

  const {
    basename = '',
    followRedirects = true,
    maxRedirects = 0,
    normalizePathname = true,
    transformRequest,
  } = options
  const normalizedRouter = normalizePathname ? routeNormalize(router) : router
  const [historySource, historyController] = history

  // Memoize creation of content/request/response, as it can have side effects
  // like precaching data.
  let last: null | [HistoryRequest<S>, RouterSnapshot<Ext, S, Response>] = null
  const memoizedHandleRequest = (
    historyRequest: HistoryRequest<S>,
  ): RouterSnapshot<Ext, S, Response> => {
    if (last && last[0] === historyRequest) {
      return last[1]
    }

    const routerRequest: RouterRequest<S> = {
      basename,
      params: {},
      ...historyRequest,
    }
    const request: RouterRequest<S> & Ext = transformRequest
      ? transformRequest(routerRequest)
      : (routerRequest as RouterRequest<S> & Ext)

    const response = ({
      head: [],
      headers: {},
      pendingCommits: [],
      pendingSuspenses: [],
    } as any) as Response

    const content = normalizedRouter(request, response)

    return {
      content,
      response,
      request,
    }
  }

  const source = fuse<RouterSnapshot<Ext, S, Response>>((use, effect) => {
    const historySnapshot = use(historySource)
    const snapshot = {
      ...memoizedHandleRequest(historySnapshot.request),
      // FIXME: should allow for routers to be used as histories, with any
      // content/response fed into the `transformRequest` function to be
      // added to the request by the application.
      pendingRequestCreation: (historySnapshot as any).pendingRequestCreation,
    }
    const response = snapshot.response

    if (followRedirects && isRedirect(response)) {
      return effect(() => {
        if (++redirectCounter > maxRedirects) {
          throw new Error('Possible redirect loop detected')
        }

        const redirectTo =
          response.headers?.Location || response.headers?.location

        if (redirectTo === undefined) {
          throw new Error('Redirect responses require a "Location" header')
        }

        return historyController.navigate(redirectTo, { replace: true })
      })
    }

    redirectCounter = 0

    return snapshot
  })

  const controller: RouterController<Ext, S, Response> = {
    // TODO:
    // - prevent these controller methods form returning until the responses
    //   are complete
    // - when the responses aren't complete, add a `pendingRoute` prop to the
    //   snapshot
    ...historyController,
    async prefetch(
      action: RouterAction<S>,
      options: {
        method?: string
      } = {},
    ): Promise<RouterState<Ext, S>> {
      const currentRequest = getSnapshot(historySource).request
      const location = applyLocationAction(currentRequest, action)
      const [state] = await getInitialStateAndResponse(
        normalizedRouter,
        location,
        {
          basename,
          method: options.method,
        },
      )
      return state
    },
  }

  return [source, controller]
}

export interface GetRouteOptions<Ext> {
  basename?: string
  method?: string
  normalizePathname?: boolean
  requestExtension?: Ext
}

export async function getInitialStateAndResponse<
  Ext,
  S extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
>(
  router: RouterFunction<RouterRequest<S> & Ext, Response>,
  action: RouterAction<S>,
  options: GetRouteOptions<Ext> = {},
): Promise<readonly [RouterState<Ext, S>, Response]> {
  const method = options.method || 'GET'
  const history = createMemoryHistory(parseLocation(action), method)
  const [routerSource] = createRouter(router, history, {
    ...options,
    followRedirects: false,
  })
  const { content, request, response } = await getSnapshotPromise(routerSource)
  await waitForMutablePromiseList(response.pendingSuspenses)
  return [
    {
      content,
      controller: getNoopController<Ext, S, Response>(),
      pending: false,
      request,
    },
    response,
  ] as const
}

function isRedirect(response: RouterResponse) {
  return response.status && response.status >= 300 && response.status < 400
}
