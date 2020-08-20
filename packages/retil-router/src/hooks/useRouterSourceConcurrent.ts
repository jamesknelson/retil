/// <reference types="react/experimental" />

import * as React from 'react'
import { useContext, useMemo, useRef } from 'react'
import { useSource } from 'use-source'

import { UseRouterDefaultsContext } from '../routerContext'
import {
  RouterHistoryState,
  RouterResponse,
  RouterSnapshot,
  RouterSource,
} from '../routerTypes'

import {
  UseRouterSourceFunction,
  UseRouterSourceOptions,
} from './useRouterSourceCommon'

const { unstable_useTransition: useTransition } = React

export const useRouterSourceConcurrent: UseRouterSourceFunction = <
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
  const transitionOptions = useMemo(
    () => ({ timeoutMs: transitionTimeoutMs }),
    [transitionTimeoutMs],
  )
  const [startTransition, pending] = useTransition(transitionOptions)
  const initialSnapshot = (Array.isArray(serviceOrSnapshot)
    ? null
    : serviceOrSnapshot) as null | RouterSnapshot<Ext, State, Response>
  const routerSource = initialSnapshot
    ? null
    : (serviceOrSnapshot as RouterSource<Ext, State, Response>)

  const lastSnapshot = useRef<RouterSnapshot<Ext, State, Response> | null>(null)
  const currentSnapshot = useSource(routerSource, {
    defaultValue: null,
    startTransition,
  })

  const snapshotPending =
    pending ||
    (currentSnapshot
      ? !!currentSnapshot.pendingRequestCreation
      : !!lastSnapshot.current)

  const snapshot = currentSnapshot || lastSnapshot.current || initialSnapshot!

  // Changing routers isn't covered by a transition, and we don't want an
  // initially empty new router to trigger a loading screen, so we'll use
  // the last snapshot from the previous router until the first snapshot
  // is available.
  if (currentSnapshot) {
    lastSnapshot.current = currentSnapshot
  }

  return [snapshot, snapshotPending]
}
