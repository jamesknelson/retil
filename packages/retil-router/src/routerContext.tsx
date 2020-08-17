import { createContext } from 'react'
import { HistoryService } from 'retil-history'
import { RouterController, RouterRequest, RouterState } from './routerTypes'

export const RouterControllerContext = createContext<RouterController>(
  undefined as any,
)
export const RouterRequestContext = createContext<RouterRequest>(
  undefined as any,
)

export interface UseRouterDefaultsContext {
  transitionTimeoutMs: number
  history?: HistoryService<any>
  initialState?: RouterState<any, any>
}
export const UseRouterDefaultsContext = createContext<UseRouterDefaultsContext>(
  {
    transitionTimeoutMs: 3000,
  },
)
