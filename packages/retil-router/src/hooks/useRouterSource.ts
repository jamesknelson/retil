import { useCallback, useEffect, useRef } from 'react'
import { getSnapshotPromise } from 'retil-source'
import { Deferred } from 'retil-support'

import {
  RouterRequest,
  RouterResponse,
  RouterSource,
  RouterSnapshot,
} from '../routerTypes'
import { waitForResponse } from '../routerUtils'

import { UseRouterSourceOptions } from './useRouterSourceCommon'

// Avoid the `use` name to disable the no conditional hooks lint check.
import { useRouterSourceBlocking as _useRouterSourceBlocking } from './useRouterSourceBlocking'
import { useRouterSourceConcurrent as _useRouterSourceConcurrent } from './useRouterSourceConcurrent'

export const useRouterSource = <
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
>(
  source: RouterSource<Request, Response>,
  options: UseRouterSourceOptions = {},
): readonly [
  RouterSnapshot<Request, Response>,
  Request | boolean,
  () => Promise<RouterSnapshot<Request, Response>>,
] => {
  const [snapshot, pending] = options.unstable_isConcurrent
    ? _useRouterSourceConcurrent(source, options)
    : _useRouterSourceBlocking(source, options)

  const request = snapshot.request
  const latestSourceRef = useRef(source)
  const latestRequestRef = useRef(request)
  const waitingDeferredsRef = useRef<Deferred<void>[]>([])

  // Only change the source once it's commited, as we don't want to wait for
  // changes from sources that never subscribed to.
  useEffect(() => {
    latestRequestRef.current = request
    latestSourceRef.current = source

    const deferreds = waitingDeferredsRef.current.slice()
    waitingDeferredsRef.current = []
    for (const deferred of deferreds) {
      deferred.resolve()
    }
  }, [request, source])

  const waitUntilNavigationCompletes = useCallback((): Promise<
    RouterSnapshot<Request, Response>
  > => {
    const source = latestSourceRef.current
    return getSnapshotPromise(source).then((snapshot) =>
      waitForResponse(snapshot.response).then(() => {
        if (source !== latestSourceRef.current) {
          // The source has updated, so start waiting with the new source
          return waitUntilNavigationCompletes()
        } else if (snapshot.request !== latestRequestRef.current) {
          // The latest snapshot hasn't been rendered yet, so wait until
          // the effect where it is first rendered.
          const deferred = new Deferred<void>()
          waitingDeferredsRef.current.push(deferred)
          return deferred.promise.then(waitUntilNavigationCompletes)
        } else {
          return snapshot
        }
      }),
    )
  }, [])

  return [snapshot, pending, waitUntilNavigationCompletes]
}

export * from './useRouterSourceCommon'
