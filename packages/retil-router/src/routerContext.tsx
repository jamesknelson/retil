import { createContext } from 'react'
import {
  RouterReactController,
  RouterRequest,
  RouterRequestService,
  RouterSnapshot,
} from './routerTypes'

export const RouterContentContext = createContext<React.ReactNode>(
  undefined as any,
)
export const RouterControllerContext = createContext<RouterReactController>(
  undefined as any,
)
export const RouterPendingContext = createContext<boolean>(false)
export const RouterRequestContext = createContext<RouterRequest>(
  undefined as any,
)

export interface UseRouterDefaultsContext {
  transitionTimeoutMs: number
  requestService?: RouterRequestService<any>
  initialSnapshot?: RouterSnapshot<any, any>
}
export const UseRouterDefaultsContext = createContext<UseRouterDefaultsContext>(
  {
    transitionTimeoutMs: Infinity,
  },
)
