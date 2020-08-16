import { createContext } from 'react'

import { RouterController, RouterRequest } from './routerTypes'

export const RouterControllerContext = createContext<RouterController>(
  undefined as any,
)
export const RouterRequestContext = createContext<RouterRequest>(
  undefined as any,
)
