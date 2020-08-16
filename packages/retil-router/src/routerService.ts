import {
  HistoryService,
  applyLocationAction,
  createMemoryHistory,
  getDefaultBrowserHistory,
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
  history?: HistoryService<S>
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
  options: RouterOptions<Ext, S> = {},
): RouterService<Ext, S, Response> {
  let redirectCounter = 0

  const {
    basename = '',
    history = getDefaultBrowserHistory() as HistoryService<S>,
    followRedirects = true,
    maxRedirects = 0,
    normalizePathname = true,
    transformRequest,
  } = options
  const normalizedRouter = normalizePathname ? routeNormalize(router) : router
  const [historySource, historyController] = history

  // Create a source for just the request, so that our fusor only produces new
  // values when the request has changed (and not the pendingLocation).
  const historyRequestSource = fuse((use) => use(historySource).request)

  const source = fuse<RouterSnapshot<Ext, S, Response>>((use, effect) => {
    const historyRequest = use(historyRequestSource)
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

    const snapshot: RouterSnapshot<Ext, S, Response> = {
      content,
      response,
      request,
    }

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
  const [routerSource] = createRouter(router, {
    history,
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
