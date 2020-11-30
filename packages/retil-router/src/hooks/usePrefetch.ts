import { useContext } from 'react'

import { RouterControllerContext } from '../routerContext'
import { RouterReactController } from '../routerTypes'

export function usePrefetch(): RouterReactController['prefetch'] {
  return useContext(RouterControllerContext).prefetch
}
