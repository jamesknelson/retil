import { useContext, useMemo } from 'react'

import { mount } from './mount'
import { CastableToEnvSource, Loader, UseMountState } from './mountTypes'
import { ServerMountContext } from './serverMountContext'
import { UseMountSourceOptions, useMountSource } from './useMountSource'

export const useMount = <Env extends object, Content>(
  loader: Loader<Env, Content>,
  env: CastableToEnvSource<Env>,
  options?: UseMountSourceOptions,
): UseMountState<Env, Content> => {
  const serverMount = useContext(ServerMountContext)

  if (
    serverMount &&
    (serverMount.loader !== loader ||
      serverMount.env !== env ||
      !serverMount.source)
  ) {
    throw new Error(
      'The ServerMount loader/env must match the <Mount> or useMount() loader/env.',
    )
  }

  const mountSource = useMemo(
    () => serverMount?.source || mount(loader, env),
    [env, loader, serverMount],
  )

  return useMountSource(mountSource, options)
}
