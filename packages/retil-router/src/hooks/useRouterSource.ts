import { HistoryState } from 'retil-history'

import { RouterResponse, RouterSource, RouterSnapshot } from '../routerTypes'

import {
  UseRouterSourceFunction,
  UseRouterSourceOptions,
} from './useRouterSourceCommon'
import { useRouterSourceConcurrent } from './useRouterSourceConcurrent'

// TODO: add a legacy router service
export const useRouterSource: UseRouterSourceFunction = <
  Ext = {},
  State extends HistoryState = HistoryState,
  Response extends RouterResponse = RouterResponse
>(
  serviceOrInitialSnapshot:
    | RouterSource<Ext, State, Response>
    | RouterSnapshot<Ext, State, Response>,
  options: UseRouterSourceOptions = {},
): readonly [RouterSnapshot<Ext, State, Response>, boolean] => {
  return useRouterSourceConcurrent(serviceOrInitialSnapshot, options)
}

export * from './useRouterSourceCommon'
