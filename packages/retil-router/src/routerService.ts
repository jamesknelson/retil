import { createMemo } from 'retil-common'
import {
  HistoryService,
  applyLocationAction,
  createMemoryHistory,
  parseLocation,
} from 'retil-history'
import {
  fuse,
  getSnapshotPromise,
  getSnapshot,
  mergeLatest,
} from 'retil-source'

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
  RouterRequestExt = {},
  HistoryRequestExt = {},
  S extends RouterHistoryState = RouterHistoryState
> {
  basename?: string
  followRedirects?: boolean
  maxRedirects?: number
  normalizePathname?: boolean
  transformRequest?: (
    request: RouterRequest<S> & HistoryRequestExt,
  ) => RouterRequest<S> & HistoryRequestExt & RouterRequestExt
}

export function createRouter<
  RouterRequestExt = {},
  HistoryRequestExt = {},
  S extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
>(
  router: RouterFunction<RouterRequest<S> & RouterRequestExt, Response>,
  history: HistoryService<HistoryRequestExt, S>,
  options: RouterOptions<RouterRequestExt, HistoryRequestExt, S>,
): RouterService<RouterRequestExt & HistoryRequestExt, S, Response> {
  let redirectCounter = 0

  const {
    basename = '',
    followRedirects = true,
    maxRedirects = 5,
    normalizePathname = true,
    transformRequest,
  } = options
  const normalizedRouter = normalizePathname ? routeNormalize(router) : router
  const [historySource, historyController] = history
  const latestHistorySource = mergeLatest(historySource)
  const snapshotMemo = createMemo<
    RouterSnapshot<RouterRequestExt & HistoryRequestExt, S, Response>
  >()

  const source = fuse<
    RouterSnapshot<RouterRequestExt & HistoryRequestExt, S, Response>
  >((use, effect) => {
    const historyRequest = use(latestHistorySource)
    const snapshot = snapshotMemo(() => {
      const routerRequest: RouterRequest<S> & HistoryRequestExt = {
        basename,
        params: {},
        ...historyRequest,
      }
      const request: RouterRequest<S> &
        HistoryRequestExt &
        RouterRequestExt = transformRequest
        ? transformRequest(routerRequest)
        : (routerRequest as RouterRequest<S> &
            HistoryRequestExt &
            RouterRequestExt)

      const response = ({
        head: [],
        headers: {},
        pendingCommits: [],
        pendingSuspenses: [],
      } as any) as Response

      return {
        content: normalizedRouter(request, response),
        response,
        request,
      }
    }, [historyRequest])
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

  const controller: RouterController<
    HistoryRequestExt & RouterRequestExt,
    S
  > = {
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
    ): Promise<RouterState<HistoryRequestExt & RouterRequestExt, S>> {
      const currentRequest = getSnapshot(historySource)
      const location = applyLocationAction(currentRequest, action)
      const [state] = await getInitialStateAndResponse<
        HistoryRequestExt & RouterRequestExt,
        S,
        Response
      >(normalizedRouter, location, {
        basename,
        method: options.method,
        // FIXME: if there's a history request ext, there's probably also a
        // prefetch function on the history controller, and we need to look
        // for it and somehow call it.
        transformRequest: transformRequest as any,
      })
      return state
    },
  }

  return [source, controller]
}

export interface GetRouteOptions<Ext> {
  basename?: string
  method?: string
  normalizePathname?: boolean
  transformRequest?: (request: RouterRequest<any>) => RouterRequest<any> & Ext
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
  const { method = 'GET', ...routerOptions } = options
  const history = createMemoryHistory(parseLocation(action), method)
  const [routerSource] = createRouter<Ext, {}, S, Response>(router, history, {
    followRedirects: false,
    ...routerOptions,
  })
  const { content, request, response } = await getSnapshotPromise(routerSource)
  await waitForMutablePromiseList(response.pendingSuspenses)
  return [
    {
      content,
      controller: getNoopController<Ext, S>(),
      pending: false,
      request,
    },
    response,
  ] as const
}

function isRedirect(response: RouterResponse) {
  return response.status && response.status >= 300 && response.status < 400
}
