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

import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { delay } from 'retil-support'
import {
  Source,
  getSnapshot,
  hasSnapshot,
  mergeLatest,
  subscribe,
} from 'retil-source'

import { UseRouterDefaultsContext } from '../routerContext'
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
  const defaultTransitionTimeoutMs = useContext(UseRouterDefaultsContext)
    .transitionTimeoutMs
  const { transitionTimeoutMs = defaultTransitionTimeoutMs } = options

  const latestSource = useMemo(
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
    source: Source<any> | null
    sourcePending: boolean
  }>(() => ({
    currentSnapshot: getSnapshot(latestSource)[0],
    pendingSnapshot: null,
    source: latestSource,
    sourcePending: false,
  }))

  const hasUnmountedRef = useRef(false)

  useEffect(
    () => () => {
      hasUnmountedRef.current = true
    },
    [],
  )

  const handleNewSnapshot = useMemo(() => {
    let hasGotInitialSnapshot = false

    return (force?: boolean) => {
      hasGotInitialSnapshot =
        !!force || hasGotInitialSnapshot || hasSnapshot(latestSource)
      if (hasGotInitialSnapshot || transitionTimeoutMs === 0) {
        const [snapshot, isSuspended] = getSnapshot(latestSource)

        if (
          transitionTimeoutMs === 0 ||
          !snapshot.response.pendingSuspenses.length
        ) {
          // TODO: update these to only update if the snapshots have changed
          setState({
            currentSnapshot: snapshot,
            pendingSnapshot: null,
            source: latestSource,
            sourcePending: isSuspended,
          })
        } else {
          setState(({ currentSnapshot }) => ({
            currentSnapshot,
            pendingSnapshot: snapshot,
            source: latestSource,
            sourcePending: false,
          }))

          Promise.race(
            [waitForResponse(snapshot.response)].concat(
              transitionTimeoutMs === Infinity
                ? []
                : [delay(transitionTimeoutMs)],
            ),
          ).then(() => {
            if (!hasUnmountedRef.current) {
              setState((state) =>
                snapshot === state.pendingSnapshot
                  ? {
                      currentSnapshot: snapshot,
                      pendingSnapshot: null,
                      source: latestSource,
                      sourcePending: false,
                    }
                  : state,
              )
            }
          })
        }
      } else {
        setState(({ currentSnapshot }) => ({
          currentSnapshot,
          pendingSnapshot: null,
          source: latestSource,
          sourcePending: true,
        }))
      }
    }
  }, [latestSource, transitionTimeoutMs])

  if (latestSource !== state.source) {
    handleNewSnapshot()
  }

  useEffect(() => {
    let unsubscribed = false

    if (
      !hasSnapshot(latestSource) &&
      transitionTimeoutMs !== Infinity &&
      transitionTimeoutMs === 0
    ) {
      delay(transitionTimeoutMs).then(() => {
        if (!unsubscribed) {
          handleNewSnapshot(true)
        }
      })
    }

    const unsubscribe = subscribe(latestSource, handleNewSnapshot)

    return () => {
      unsubscribed = true
      unsubscribe()
    }
  }, [latestSource, handleNewSnapshot, transitionTimeoutMs])

  return [state.currentSnapshot, !!state.pendingSnapshot || state.sourcePending]
}
