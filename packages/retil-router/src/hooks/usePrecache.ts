import { useContext } from 'react'

import { RouterControllerContext } from '../routerContext'
import { MountedRouterController } from '../routerTypes'

export function usePrecache(): MountedRouterController['precache'] {
  return useContext(RouterControllerContext).precache
}
