/// <reference types="react/experimental" />

import * as React from 'react'
import { useMemo, useRef } from 'react'
import { mergeLatest, useSource } from 'retil-source'

import {
  RouterRouteSnapshot,
  RouterResponse,
  RouterRouteSnapshot,
  RouterSource,
} from '../routerTypes'

import {
  UseRouterSourceFunction,
  UseRouterSourceOptions,
} from './useRouterSourceCommon'

const { unstable_useTransition: useTransition } = React

export const useRouterSourceConcurrent: UseRouterSourceFunction = <
  Request extends RouterRouteSnapshot = RouterRouteSnapshot,
  Response extends RouterResponse = RouterResponse
>(
  source: RouterSource<Request, Response>,
  options: UseRouterSourceOptions = {},
): readonly [RouterRouteSnapshot<Request, Response>, boolean] => {
  const [startTransition, pending] = useTransition()
  const latestSource = useMemo(
    () =>
      mergeLatest(
        source,
        (latestSnapshot, isSuspended) => [latestSnapshot, isSuspended] as const,
      ),
    [source],
  )

  const lastSnapshot = useRef<RouterRouteSnapshot<Request, Response> | null>(
    null,
  )
  const [currentSnapshot, isSuspended] =
    useSource(latestSource, {
      defaultValue: null,
      startTransition,
    }) || ([null, false] as const)

  const snapshotPending =
    pending || (currentSnapshot ? isSuspended : !!lastSnapshot.current)

  const snapshot = currentSnapshot || lastSnapshot.current

  // Changing routers isn't covered by a transition, and we don't want an
  // initially empty new router to trigger a loading screen, so we'll use
  // the last snapshot from the previous router until the first snapshot
  // is available.
  if (currentSnapshot) {
    lastSnapshot.current = currentSnapshot
  }

  return [snapshot!, snapshotPending]
}
