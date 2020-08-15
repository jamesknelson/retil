/// <reference types="react/experimental" />

import * as React from 'react'
import { useMemo } from 'react'
import { HistoryState } from 'retil-history'
import { useSource } from 'use-source'

import { RouterResponse, RouterSnapshot, RouterSource } from '../routerTypes'

import {
  UseRouterSourceFunction,
  UseRouterSourceOptions,
} from './useRouterSourceCommon'

const DefaultTransitionTimeoutMs = 3000
const { unstable_useTransition: useTransition } = React

export const useRouterSourceConcurrent: UseRouterSourceFunction = <
  Ext = {},
  State extends HistoryState = HistoryState,
  Response extends RouterResponse = RouterResponse
>(
  serviceOrInitialSnapshot:
    | RouterSource<Ext, State, Response>
    | RouterSnapshot<Ext, State, Response>,
  options: UseRouterSourceOptions = {},
): readonly [RouterSnapshot<Ext, State, Response>, boolean] => {
  const initialSnapshot = (Array.isArray(serviceOrInitialSnapshot)
    ? null
    : serviceOrInitialSnapshot) as null | RouterSnapshot<Ext, State, Response>
  const routerSource = initialSnapshot
    ? null
    : (serviceOrInitialSnapshot as RouterSource<Ext, State, Response>)
  const { transitionTimeoutMs = DefaultTransitionTimeoutMs } = options
  const transitionOptions = useMemo(
    () => ({ timeoutMs: transitionTimeoutMs }),
    [transitionTimeoutMs],
  )
  const [startTransition, pending] = useTransition(transitionOptions)
  const snapshot =
    useSource(initialSnapshot ? null : routerSource!, {
      defaultValue: null,
      startTransition,
    }) || initialSnapshot!

  return [snapshot, pending]
}
