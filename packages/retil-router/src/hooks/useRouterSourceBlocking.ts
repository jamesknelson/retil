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

import { useEffect, useRef, useState } from 'react'
import { delay } from 'retil-common'
import { getSnapshot, subscribe } from 'retil-source'

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

const DefaultTransitionTimeoutMs = 3000

export const useRouterSourceBlocking: UseRouterSourceFunction = <
  Ext = {},
  State extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
>(
  serviceOrInitialSnapshot:
    | RouterSource<Ext, State, Response>
    | RouterSnapshot<Ext, State, Response>,
  options: UseRouterSourceOptions = {},
): readonly [RouterSnapshot<Ext, State, Response>, boolean] => {
  const { transitionTimeoutMs = DefaultTransitionTimeoutMs } = options
  const initialSnapshot = (Array.isArray(serviceOrInitialSnapshot)
    ? null
    : serviceOrInitialSnapshot) as null | RouterSnapshot<Ext, State, Response>
  const routerSource = initialSnapshot
    ? null
    : (serviceOrInitialSnapshot as RouterSource<Ext, State, Response>)

  const [state, setState] = useState<
    [
      RouterSnapshot<Ext, State, Response>,
      RouterSnapshot<Ext, State, Response> | null,
    ]
  >(() => [initialSnapshot || getSnapshot(routerSource!), null])

  const hasUnmountedRef = useRef(false)

  useEffect(
    () => () => {
      hasUnmountedRef.current = true
    },
    [],
  )

  useEffect(() => {
    if (routerSource) {
      return subscribe(routerSource, () => {
        const snapshot = getSnapshot(routerSource)
        if (
          transitionTimeoutMs === 0 ||
          !snapshot.response.pendingSuspenses.length
        ) {
          setState([snapshot, null])
        } else {
          setState(([currentSnapshot]) => [currentSnapshot, snapshot])

          Promise.race([
            delay(transitionTimeoutMs),
            waitForMutablePromiseList(snapshot.response.pendingSuspenses),
          ]).then(() => {
            if (!hasUnmountedRef.current) {
              setState(([latestSnapshot, pendingSnapshot]) =>
                snapshot === pendingSnapshot
                  ? [snapshot, null]
                  : [latestSnapshot, pendingSnapshot],
              )
            }
          })
        }
      })
    }
  }, [routerSource, transitionTimeoutMs])

  return [state[0], !!state[1]]
}
