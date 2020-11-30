import { useContext } from 'react'

import { RouterControllerContext } from '../routerContext'
import { RouterReactController } from '../routerTypes'

export function useWaitUntilNavigationCompletes(): RouterReactController['waitUntilNavigationCompletes'] {
  return useContext(RouterControllerContext).waitUntilNavigationCompletes
}
