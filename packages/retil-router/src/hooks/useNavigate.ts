import { useContext } from 'react'

import { RouterControllerContext } from '../routerContext'
import { RouterReactController } from '../routerTypes'

export function useNavigate(): RouterReactController['navigate'] {
  return useContext(RouterControllerContext).navigate
}
