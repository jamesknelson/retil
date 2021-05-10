import { useContext } from 'react'

import { RouterControllerContext } from '../routerContext'
import { MountedRouterController } from '../routerTypes'

export function useBlockNavigation(): MountedRouterController['block'] {
  return useContext(RouterControllerContext).block
}
