import {
  HistoryAction,
  HistoryRequest,
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
  MaybePlannedRequest,
  PlannedRequest,
  RouterRequestController,
  RouterRequestExtension,
  RouterRequestService,
} from './routerTypes'

export interface CreateRouterRequestServiceOptions<
  Ext,
  Request extends MaybePlannedRequest = HistoryRequest
> {
  basename?: string
  extend?: (request: Request, use: FusorUse) => Ext
  historyService?: RouterRequestService<Request>

  // TODO: configurable getActionKey, which returns an array of keys, and use
  // a more flexible keyed cache which should probably go in retil-support.
}

export function createRequestService<
  Ext,
  Request extends MaybePlannedRequest = HistoryRequest
>(
  options: CreateRouterRequestServiceOptions<Ext, Request> = {},
): RouterRequestService<Request & RouterRequestExtension & Ext> {
  const {
    basename = '',
    historyService = (getDefaultBrowserHistory() as any) as [
      Source<Request>,
      RouterRequestController<Request>,
    ],
    extend,
  } = options
  const [baseSource, baseController] = historyService

  const planningActions = createActionMap<{
    promise: Promise<Request & RouterRequestExtension & Ext & PlannedRequest>
    done: boolean
  }>()
  const plannedActions = new Map<
    symbol,
    Request & RouterRequestExtension & Ext & PlannedRequest
  >()
  const planUnsubscribes = new Set<() => void>()

  const requestMemo = createMemo<
    Request & RouterRequestExtension & Ext & PlannedRequest
  >()

  const source = fuse<Request & RouterRequestExtension & Ext>((use) => {
    const historyRequest = use(baseSource)
    const plannedRequest =
      historyRequest.planId && plannedActions.get(historyRequest.planId)

    // Clear our plans, as any change from now on should result in a new
    // request.
    plannedActions.clear()
    planningActions.clear()
    planUnsubscribes.forEach((unsubscribe) => unsubscribe())
    planUnsubscribes.clear()

    // Get the extension even if we have a planned request, as we want to make
    // sure that any changes to sources that the extension uses will trigger
    // another execution of the fusor function.
    const extension = (extend && extend(historyRequest, use)) as Ext

    return requestMemo(
      () =>
        plannedRequest || {
          params: {},
          basename,
          ...historyRequest,
          ...extension,
          planId: undefined as any,
        },
      [historyRequest, extension],
    )
  })

  const createPlan = async (
    action: HistoryAction,
  ): Promise<Request & RouterRequestExtension & Ext & PlannedRequest> => {
    const plannedHistoryRequest = await baseController.plan(action)

    if (!extend) {
      return {
        basename,
        params: {},
        ...plannedHistoryRequest,
      } as Request & RouterRequestExtension & Ext & PlannedRequest
    }

    const extensionSource = fuse((use) => extend(plannedHistoryRequest, use))
    const extension = await getSnapshotPromise(extensionSource)

    const plannedRequest = {
      basename,
      params: {},
      ...plannedHistoryRequest,
      ...extension,
    }

    plannedActions.set(plannedRequest.planId, plannedRequest)

    // If the extension source emits a new snapshot, it'll invalidate our
    // planned request.
    const unsubscribe = subscribe(extensionSource, () => {
      plannedActions.delete(plannedRequest.planId)
      planningActions.delete(action)
      planUnsubscribes.delete(unsubscribe)
      unsubscribe()
    })
    planUnsubscribes.add(unsubscribe)

    return plannedRequest
  }

  const controller: RouterRequestController<
    Request & RouterRequestExtension & Ext
  > = {
    block: baseController.block,

    navigate: async (action, options) => {
      // If we're currently planning this action, then wait until planning is
      // complete before navigating, as otherwise we'll need to start the plan
      // from scratch.
      const currentlyPlanning = planningActions.get(action)
      if (currentlyPlanning && !currentlyPlanning.done) {
        let hasChanged = false

        // Cancel navigation if something else causes navigation in the
        // meantime.
        const unsubscribe = subscribe(baseSource, () => {
          hasChanged = true
        })
        await currentlyPlanning
        unsubscribe()
        if (hasChanged) {
          return false
        }
      }

      return baseController.navigate(action, options)
    },

    plan: (action) => {
      const planningRequest = planningActions.get(action)
      if (planningRequest) {
        return planningRequest.promise
      }

      const promise = createPlan(action)
      const cache = { promise, done: false }
      planningActions.set(action, cache)
      promise.then(() => {
        cache.done = true
      })
      return promise
    },
  }

  return [source, controller]
}
