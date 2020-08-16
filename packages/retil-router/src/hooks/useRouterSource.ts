import {
  RouterHistoryState,
  RouterResponse,
  RouterSource,
  RouterSnapshot,
} from '../routerTypes'

import {
  UseRouterSourceFunction,
  UseRouterSourceOptions,
} from './useRouterSourceCommon'

// Avoid the `use` name to disable the no conditional hooks lint check.
import { useRouterSourceBlocking as _useRouterSourceBlocking } from './useRouterSourceBlocking'
import { useRouterSourceConcurrent as _useRouterSourceConcurrent } from './useRouterSourceConcurrent'

export const useRouterSource: UseRouterSourceFunction = <
  Ext = {},
  State extends RouterHistoryState = RouterHistoryState,
  Response extends RouterResponse = RouterResponse
>(
  serviceOrSnapshot:
    | RouterSource<Ext, State, Response>
    | RouterSnapshot<Ext, State, Response>,
  options: UseRouterSourceOptions = {},
): readonly [RouterSnapshot<Ext, State, Response>, boolean] => {
  return options.unstable_isConcurrent
    ? _useRouterSourceConcurrent(serviceOrSnapshot, options)
    : _useRouterSourceBlocking(serviceOrSnapshot, options)
}

export * from './useRouterSourceCommon'
