import { useContext } from 'react'

import { RouterControllerContext } from '../routerContext'
import { RouterReactController } from '../routerTypes'

export function useWaitUntilNavigationCompletes(
  forceValue?: RouterReactController['waitUntilNavigationCompletes'],
): RouterReactController['waitUntilNavigationCompletes'] {
  const contextController = useContext(RouterControllerContext)
  return forceValue || contextController.waitUntilNavigationCompletes
}
