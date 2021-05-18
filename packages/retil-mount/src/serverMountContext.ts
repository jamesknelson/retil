import { createContext } from 'react'

import { EnvType, Loader, MountSource } from './mountTypes'

export const ServerMountContext =
  createContext<null | {
    loader: Loader<any>
    env: EnvType<object>
    source: MountSource<any, any>
  }>(null)
