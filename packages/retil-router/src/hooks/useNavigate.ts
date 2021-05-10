import { useContext } from 'react'

import { RouterControllerContext } from '../routerContext'
import { MountedRouterController } from '../routerTypes'

export function useNavigate(): MountedRouterController['navigate'] {
  return useContext(RouterControllerContext).navigate
}
