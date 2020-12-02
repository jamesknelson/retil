/**
 * For the blocking mode hook, we can't just `useSource()` if we want to
 * get route transitions which wait for the next route to load, because
 * useSource() (and useSubscription()) always immediately sets state --
 * even if we provide a `startTransition` function.
 *
 * In order to subscribe to a source *and maybe wait before saving the received
 * value to React state*, we'll need custom subscription logic. That's what
 * this hook provides.
 */

import { useEffect, useMemo, useState } from 'react'
import { delay } from 'retil-support'
import {
  Source,
  getSnapshot,
  hasSnapshot,
  mergeLatest,
  subscribe,
} from 'retil-source'

import {
  RouterRequest,
  RouterResponse,
  RouterSnapshot,
  RouterSource,
} from '../routerTypes'
import { waitForResponse } from '../routerUtils'

import {
  UseRouterSourceFunction,
  UseRouterSourceOptions,
} from './useRouterSourceCommon'

export const useRouterSourceBlocking: UseRouterSourceFunction = <
  Request extends RouterRequest = RouterRequest,
  Response extends RouterResponse = RouterResponse
>(
  source: RouterSource<Request, Response>,
  options: UseRouterSourceOptions = {},
): readonly [RouterSnapshot<Request, Response>, boolean] => {
  const { transitionTimeoutMs = Infinity } = options

  const mergedSource = useMemo(
    () =>
      mergeLatest(
        source,
        (latestSnapshot, isSuspended) => [latestSnapshot, isSuspended] as const,
      ),
    [source],
  )

  const [state, setState] = useState<{
    currentSnapshot: RouterSnapshot<Request, Response>
    pendingSnapshot: RouterSnapshot<Request, Response> | null
    mergedSource: Source<any> | null
    sourcePending: boolean
  }>(() => ({
    currentSnapshot: getSnapshot(mergedSource)[0],
    pendingSnapshot: null,
    mergedSource,
    sourcePending: false,
  }))

  const handleNewSnapshot = useMemo(() => {
    let hasGotInitialSnapshot = false

    return (force?: boolean, newSource?: Source<any>) => {
      hasGotInitialSnapshot =
        !!force || hasGotInitialSnapshot || hasSnapshot(mergedSource)
      let [newSnapshot, sourcePending] =
        hasGotInitialSnapshot || transitionTimeoutMs === 0
          ? getSnapshot(mergedSource)
          : [undefined, true]
      const pendingSnapshot =
        newSnapshot?.response.pendingSuspenses.length &&
        transitionTimeoutMs !== 0
          ? newSnapshot
          : null
      setState((state) =>
        newSource || state.mergedSource === mergedSource
          ? {
              currentSnapshot:
                !sourcePending && !pendingSnapshot
                  ? newSnapshot!
                  : state.currentSnapshot,
              pendingSnapshot,
              mergedSource: newSource || state.mergedSource,
              sourcePending,
            }
          : state,
      )
    }
  }, [mergedSource, transitionTimeoutMs])

  if (mergedSource !== state.mergedSource) {
    handleNewSnapshot(false, mergedSource)
  }

  // Don't waitForResponse until an effect has run, as this can trigger
  // lazily loaded promises that we only want to run once.
  const pendingSnapshot = state.pendingSnapshot
  useEffect(() => {
    let unsubscribed = false
    if (pendingSnapshot) {
      Promise.race(
        [waitForResponse(pendingSnapshot.response)].concat(
          transitionTimeoutMs === Infinity ? [] : [delay(transitionTimeoutMs)],
        ),
      ).then(() => {
        if (!unsubscribed) {
          setState((state) =>
            pendingSnapshot === state.pendingSnapshot
              ? {
                  currentSnapshot: pendingSnapshot,
                  pendingSnapshot: null,
                  mergedSource,
                  sourcePending: false,
                }
              : state,
          )
        }
      })
    }

    return () => {
      unsubscribed = true
    }
  }, [pendingSnapshot, mergedSource, transitionTimeoutMs])

  useEffect(() => {
    let unsubscribed = false

    // If there's no initial snapshot, then calling getSnapshot() will throw
    // a Suspense. But if we've given a transition timeout, we'll do it anyway.
    if (
      !hasSnapshot(mergedSource) &&
      transitionTimeoutMs !== Infinity &&
      transitionTimeoutMs === 0
    ) {
      delay(transitionTimeoutMs).then(() => {
        if (!unsubscribed) {
          handleNewSnapshot(true)
        }
      })
    }

    const unsubscribe = subscribe(mergedSource, handleNewSnapshot)

    return () => {
      unsubscribed = true
      unsubscribe()
    }
  }, [mergedSource, handleNewSnapshot, transitionTimeoutMs])

  return [state.currentSnapshot, !!pendingSnapshot || state.sourcePending]
}
