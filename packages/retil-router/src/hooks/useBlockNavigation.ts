import { useContext } from 'react'

import { RouterControllerContext } from '../routerContext'
import { RouterReactController } from '../routerTypes'

export function useBlockNavigation(): RouterReactController['block'] {
  return useContext(RouterControllerContext).block
}
