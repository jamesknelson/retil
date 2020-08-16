/// <reference types="react/experimental" />

import * as React from 'react'
import { useMemo } from 'react'
import { useSource } from 'use-source'

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

const DefaultTransitionTimeoutMs = 3000
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
  const { transitionTimeoutMs = DefaultTransitionTimeoutMs } = options
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
  const snapshot =
    useSource(routerSource, {
      defaultValue: null,
      startTransition,
    }) || initialSnapshot!

  return [snapshot, pending]
}
