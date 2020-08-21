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
import { delay } from 'retil-common'
import {
  Source,
  getSnapshot,
  getSnapshotPromise,
  hasSnapshot,
  mergeLatest,
  subscribe,
} from 'retil-source'

import { UseRouterDefaultsContext } from '../routerContext'
import {
  RouterHistoryState,
  RouterResponse,
  RouterSnapshot,
  RouterSource,
} from '../routerTypes'
import { waitForMutablePromiseList } from '../routerUtils'

import {
  UseRouterSourceFunction,
  UseRouterSourceOptions,
} from './useRouterSourceCommon'

export const useRouterSourceBlocking: UseRouterSourceFunction = <
  Ext = {},
  State extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
>(
  serviceOrSnapshot:
    | RouterSource<Ext, State, Response>
    | RouterSnapshot<Ext, State, Response>,
  options: UseRouterSourceOptions = {},
): readonly [RouterSnapshot<Ext, State, Response>, boolean] => {
  const defaultTransitionTimeoutMs = useContext(UseRouterDefaultsContext)
    .transitionTimeoutMs
  const { transitionTimeoutMs = defaultTransitionTimeoutMs } = options
  const initialSnapshot = (Array.isArray(serviceOrSnapshot)
    ? null
    : serviceOrSnapshot) as null | RouterSnapshot<Ext, State, Response>

  const source = useMemo(
    () =>
      initialSnapshot
        ? null
        : mergeLatest(
            serviceOrSnapshot as RouterSource<Ext, State, Response>,
            (latestSnapshot, isSuspended) =>
              [latestSnapshot, isSuspended] as const,
          ),
    [initialSnapshot, serviceOrSnapshot],
  )

  const [state, setState] = useState<{
    currentSnapshot: RouterSnapshot<Ext, State, Response>
    pendingSnapshot: RouterSnapshot<Ext, State, Response> | null
    source: Source<any> | null
    sourcePending: boolean
  }>(() => {
    return {
      currentSnapshot: initialSnapshot! || getSnapshot(source!)[0],
      pendingSnapshot: null,
      source,
      sourcePending: false,
    }
  })

  const hasUnmountedRef = useRef(false)

  useEffect(
    () => () => {
      hasUnmountedRef.current = true
    },
    [],
  )

  const handleNewSnapshot = useMemo(() => {
    let hasGotInitialSnapshot = false

    return () => {
      if (source) {
        hasGotInitialSnapshot = hasGotInitialSnapshot || hasSnapshot(source)
        if (hasGotInitialSnapshot || transitionTimeoutMs === 0) {
          const [snapshot, isSuspended] = getSnapshot(source)
          if (
            transitionTimeoutMs === 0 ||
            !snapshot.response.pendingSuspenses.length
          ) {
            // TODO: update these to only update if the snapshots have changed
            setState({
              currentSnapshot: snapshot,
              pendingSnapshot: null,
              source,
              sourcePending: isSuspended,
            })
          } else {
            setState(({ currentSnapshot }) => ({
              currentSnapshot,
              pendingSnapshot: snapshot,
              source,
              sourcePending: false,
            }))

            Promise.race(
              [
                waitForMutablePromiseList(snapshot.response.pendingSuspenses),
              ].concat(
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
                        source,
                        sourcePending: false,
                      }
                    : state,
                )
              }
            })
          }
        } else {
          Promise.race([
            delay(transitionTimeoutMs),
            getSnapshotPromise(source),
          ]).then(handleNewSnapshot)
        }
      }
    }
  }, [source, transitionTimeoutMs])

  if (source !== state.source) {
    handleNewSnapshot()
  }

  useEffect(() => {
    if (source) {
      return subscribe(source, handleNewSnapshot)
    }
  }, [source, handleNewSnapshot])

  return [state.currentSnapshot, !!state.pendingSnapshot || state.sourcePending]
}
