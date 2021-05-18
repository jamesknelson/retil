import { useContext, useMemo } from 'react'

import { mount } from './mount'
import { EnvType, Loader, UseMountState } from './mountTypes'
import { ServerMountContext } from './serverMountContext'
import { UseMountSourceOptions, useMountSource } from './useMountSource'

export const useMount = <Env extends object, Content>(
  loader: Loader<Env, Content>,
  env: EnvType<Env>,
  options?: UseMountSourceOptions,
): UseMountState<Env, Content> => {
  const serverMount = useContext(ServerMountContext)

  if (
    serverMount &&
    (serverMount.loader !== loader || serverMount.env !== env)
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
