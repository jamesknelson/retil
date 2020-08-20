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
  getSnapshot,
  getSnapshotPromise,
  hasSnapshot,
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
  const source = initialSnapshot
    ? null
    : (serviceOrSnapshot as RouterSource<Ext, State, Response>)

  const [state, setState] = useState<{
    currentSnapshot: RouterSnapshot<Ext, State, Response>
    pendingSnapshot: RouterSnapshot<Ext, State, Response> | null
    source: RouterSource<Ext, State, Response> | null
  }>(() => ({
    currentSnapshot: initialSnapshot || getSnapshot(source!),
    pendingSnapshot: null,
    source,
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

    return () => {
      if (source) {
        hasGotInitialSnapshot = hasGotInitialSnapshot || hasSnapshot(source)
        if (hasGotInitialSnapshot || transitionTimeoutMs === 0) {
          const snapshot = getSnapshot(source)
          if (
            transitionTimeoutMs === 0 ||
            !snapshot.response.pendingSuspenses.length
          ) {
            setState({
              currentSnapshot: snapshot,
              pendingSnapshot: null,
              source,
            })
          } else {
            setState(({ currentSnapshot }) => ({
              currentSnapshot,
              pendingSnapshot: snapshot,
              source,
            }))

            Promise.race([
              delay(transitionTimeoutMs),
              waitForMutablePromiseList(snapshot.response.pendingSuspenses),
            ]).then(() => {
              if (!hasUnmountedRef.current) {
                setState(({ currentSnapshot, pendingSnapshot }) =>
                  snapshot === pendingSnapshot
                    ? {
                        currentSnapshot: snapshot,
                        pendingSnapshot: null,
                        source,
                      }
                    : { currentSnapshot, pendingSnapshot, source },
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

  return [
    state.currentSnapshot,
    !!state.pendingSnapshot || !!state.currentSnapshot.pendingRequestCreation,
  ]
}
