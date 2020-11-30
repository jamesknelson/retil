import { ReactNode, useContext } from 'react'

import { RouterContentContext } from '../routerContext'

export function useRouterContent(): ReactNode {
  return useContext(RouterContentContext)
}
