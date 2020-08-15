import * as React from 'react'
import { createContext } from 'react'

import { RouterController, RouterRequest } from './routerTypes'

export const RouterContentContext = createContext<React.ReactNode>(
  undefined as any,
)
export const RouterControllerContext = createContext<RouterController>(
  undefined as any,
)
export const RouterPendingContext = createContext<boolean>(false)
export const RouterRequestContext = createContext<RouterRequest>(
  undefined as any,
)
