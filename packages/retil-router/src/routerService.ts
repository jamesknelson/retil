import { createMemo, delay } from 'retil-support'
import {
  HistoryService,
  resolveAction,
  createMemoryHistory,
  parseLocation,
} from 'retil-history'
import { Source, fuse, getSnapshotPromise, getSnapshot } from 'retil-source'

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
  RouterRequestExtender,
} from './routerTypes'
import { getNoopController, waitForMutablePromiseList } from './routerUtils'

import { routeNormalize } from './routers/routeNormalize'

export interface RouterOptions<
  RouterRequestExt extends object = {},
  HistoryRequestExt extends object = {}
> {
  basename?: string
  followRedirects?: boolean
  maxRedirects?: number
  normalizePathname?: boolean
  extendRequest?: RouterRequestExtender<RouterRequestExt, HistoryRequestExt>
}

export function createRouter<
  RouterRequestExt extends object = {},
  HistoryRequestExt extends object = {},
  S extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
>(
  router: RouterFunction<
    RouterRequest<S> & HistoryRequestExt & RouterRequestExt,
    Response
  >,
  history: HistoryService<HistoryRequestExt, S>,
  options: RouterOptions<RouterRequestExt, HistoryRequestExt>,
): RouterService<RouterRequestExt & HistoryRequestExt, S, Response> {
  let redirectCounter = 0

  const {
    basename = '',
    followRedirects = true,
    maxRedirects = 5,
    normalizePathname = true,
    extendRequest,
  } = options
  const normalizedRouter = normalizePathname ? routeNormalize(router) : router
  const [historySource, historyController] = history
  const baseRequestSource = fuse((use) => {
    const historyRequest = use(historySource)
    const routerRequest: RouterRequest<S> & HistoryRequestExt = {
      basename,
      params: {},
      ...historyRequest,
    }
    return routerRequest
  })
  const requestSource = extendRequest
    ? (fuse((use) => {
        const baseRequest = use(baseRequestSource)
        return {
          ...baseRequest,
          ...extendRequest(baseRequest, use),
        }
      }) as Source<RouterRequest<S> & HistoryRequestExt & RouterRequestExt>)
    : (baseRequestSource as Source<
        RouterRequest<S> & HistoryRequestExt & RouterRequestExt
      >)

  const snapshotMemo = createMemo<
    RouterSnapshot<RouterRequestExt & HistoryRequestExt, S, Response>
  >()

  const source = fuse<
    RouterSnapshot<RouterRequestExt & HistoryRequestExt, S, Response>
  >((use, effect) => {
    const request = use(requestSource)
    const snapshot = snapshotMemo(() => {
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
    }, [request])
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

        // Redirects should never be blocked, so we'll force immediate
        // navigation. This has the advantage of allowing the effect to resolve
        // synchronously.
        historyController.forceNavigate(redirectTo, { replace: true })
      })
    }

    redirectCounter = 0

    return snapshot
  })

  const waitUntilStable = async (): Promise<void> => {
    const { response } = await getSnapshotPromise(source)
    await waitForMutablePromiseList(response.pendingSuspenses)
    const status = response.status || 200
    if (status >= 300 && status < 400) {
      await delay(0)
      return waitUntilStable()
    }
  }

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
      const location = resolveAction(action, currentRequest.pathname)
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
        extendRequest: extendRequest as any,
      })
      return state
    },
    waitUntilStable,
  }

  return [source, controller]
}

export interface GetRouteOptions<Ext extends object = {}> {
  basename?: string
  method?: string
  normalizePathname?: boolean
  extendRequest?: RouterRequestExtender<Ext>
}

export async function getInitialStateAndResponse<
  Ext extends object = {},
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
