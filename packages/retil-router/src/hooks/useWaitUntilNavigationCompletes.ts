import { useContext } from 'react'

import { RouterControllerContext } from '../routerContext'
import { MountedRouterController } from '../routerTypes'

export function useWaitUntilNavigationCompletes(
  forceValue?: MountedRouterController['waitUntilNavigationCompletes'],
): MountedRouterController['waitUntilNavigationCompletes'] {
  const contextController = useContext(RouterControllerContext)
  return forceValue || contextController.waitUntilNavigationCompletes
}
