import { useContext } from 'react'

import { RouterControllerContext } from '../routerContext'
import { RouterReactController } from '../routerTypes'

export function usePrecache(): RouterReactController['precache'] {
  return useContext(RouterControllerContext).precache
}
