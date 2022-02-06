import { createContext } from 'react'

import { CastableToEnvSource, Loader, MountSource } from './mountTypes'

export const ServerMountContext = /*#__PURE__*/ createContext<null | {
  loader: Loader<any>
  env: CastableToEnvSource<object>
  source: MountSource<any, any>
}>(null)
