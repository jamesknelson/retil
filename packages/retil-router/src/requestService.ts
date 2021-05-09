import {
  HistoryAction,
  HistorySnapshot,
  createActionMap,
  getDefaultBrowserHistory,
} from 'retil-history'
import {
  FusorUse,
  Source,
  fuse,
  getSnapshotPromise,
  subscribe,
} from 'retil-source'
import { createMemo } from 'retil-support'

import {
  MaybePrecachedContext,
  PrecachedSnapshot,
  RouterInputController,
  RouterRequestExtension,
  RouterHistoryService as RouterRequestService,
} from './routerTypes'

export interface CreateRouterRequestServiceOptions<
  ContextSnapshot extends object,
  RequestSnapshot extends MaybePrecachedContext = HistorySnapshot
> {
  basename?: string
  fuseContext?: (request: RequestSnapshot, use: FusorUse) => ContextSnapshot
  requestService?: RouterRequestService<RequestSnapshot>
}

export function createRequestService<
  Ext extends object,
  Request extends MaybePrecachedContext = HistorySnapshot
>(
  options: CreateRouterRequestServiceOptions<Ext, Request> = {},
): RouterRequestService<Request & RouterRequestExtension & Ext> {
  const {
    basename = '',
    requestService: historyService = (getDefaultBrowserHistory() as any) as [
      Source<Request>,
      RouterInputController<Request>,
    ],
    fuseContext: extend,
  } = options
  const [baseSource, baseController] = historyService

  const precachingActions = createActionMap<{
    promise: Promise<Request & RouterRequestExtension & Ext & PrecachedSnapshot>
    done: boolean
  }>()
  const precachedActions = new Map<
    symbol,
    Request & RouterRequestExtension & Ext & MaybePrecachedContext
  >()
  const precacheUnsubscribes = new Set<() => void>()

  const requestMemo = createMemo<
    Request & RouterRequestExtension & Ext & MaybePrecachedContext
  >()

  const source = fuse<Request & RouterRequestExtension & Ext>((use) => {
    const historyRequest = use(baseSource)
    const precachedRequest =
      historyRequest.precacheId &&
      precachedActions.get(historyRequest.precacheId)

    // Clear our precache, as any change from now on should result in a new
    // request.
    precachedActions.clear()
    precachingActions.clear()
    precacheUnsubscribes.forEach((unsubscribe) => unsubscribe())
    precacheUnsubscribes.clear()

    // Get the extension even if we have a precached request, as we want to
    // make sure that any changes to sources that the extension uses will
    // trigger another execution of the fusor function.
    const extension = (extend && extend(historyRequest, use)) as Ext

    return requestMemo(
      () =>
        precachedRequest || {
          params: {},
          basename,
          ...historyRequest,
          ...extension,
        },
      [
        historyRequest,
        ...([] as (string | any)[]).concat(...Object.entries(extension || {})),
      ],
    )
  })

  const precacheRequest = async (
    action: HistoryAction,
  ): Promise<Request & RouterRequestExtension & Ext & PrecachedSnapshot> => {
    const precachedHistoryRequest = await baseController.precache(action)
    const historyPrecacheId = precachedHistoryRequest.precacheId

    if (!extend) {
      return {
        basename,
        params: {},
        ...precachedHistoryRequest,
      } as Request & RouterRequestExtension & Ext & PrecachedSnapshot
    }

    const extensionSource = fuse((use) => extend(precachedHistoryRequest, use))
    const extension = await getSnapshotPromise(extensionSource)

    const precachedRequest = {
      basename,
      params: {},
      ...precachedHistoryRequest,
      ...extension,

      // Override the history's precacheId with a new one that differs between
      // extensions.
      precacheId: Symbol(),
    }

    precachedActions.set(historyPrecacheId, precachedRequest)

    // If the extension source emits a new snapshot, it'll invalidate our
    // precached request.
    const unsubscribe = subscribe(extensionSource, () => {
      precachedActions.delete(precachedRequest.precacheId)
      precachingActions.delete(action)
      precacheUnsubscribes.delete(unsubscribe)
      unsubscribe()
    })
    precacheUnsubscribes.add(unsubscribe)

    // TODO: throw a cancellation exception and set `context.stale` to true if
    // the extension changes

    return precachedRequest
  }

  const controller: RouterInputController<
    Request & RouterRequestExtension & Ext
  > = {
    block: baseController.block,

    navigate: async (action, options) => {
      // If we're currently precaching this action, then wait until precaching
      // is complete before navigating, as otherwise we'll ignore the precache
      // and re-start the request from scratch.
      const currentlyPrecaching = precachingActions.get(action)
      if (currentlyPrecaching && !currentlyPrecaching.done) {
        let hasChanged = false

        // Cancel navigation if something else causes navigation in the
        // meantime.
        const unsubscribe = subscribe(baseSource, () => {
          hasChanged = true
        })
        await currentlyPrecaching
        unsubscribe()
        if (hasChanged) {
          return false
        }
      }

      return baseController.navigate(action, options)
    },

    precache: (action) => {
      const precachingRequest = precachingActions.get(action)
      if (precachingRequest) {
        return precachingRequest.promise
      }

      const promise = precacheRequest(action)
      const cache = { promise, done: false }
      precachingActions.set(action, cache)
      promise.then(() => {
        cache.done = true
      })

      return promise
    },
  }

  return [source, controller]
}
