import { createContext } from 'react'
import { MountedRouterController, RouterRouteSnapshot } from './routerTypes'

export const RouterContentContext = createContext<React.ReactNode>(
  undefined as any,
)
export const RouterControllerContext = createContext<MountedRouterController>(
  undefined as any,
)
export const RouterPendingContext = createContext<
  RouterRouteSnapshot | boolean | undefined
>(false)
export const RouterRequestContext = createContext<RouterRouteSnapshot>(
  undefined as any,
)
