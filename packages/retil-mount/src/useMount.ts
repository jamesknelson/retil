import { useContext } from 'react'
import { createWeakMemo } from 'retil-support'

import { mount } from './mount'
import { CastableToEnvSource, Loader, UseMountState } from './mountTypes'
import { ServerMountContext } from './serverMountContext'
import { UseMountSourceOptions, useMountSource } from './useMountSource'

const mountSourceMemo = createWeakMemo()

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

  // Even in strict mode, we don't want to create two mount sources, so instead
  // of useMemo, we'll use a WeakMemo to memoize the mount sources externally to
  // the component.
  const mountSource =
    serverMount?.source ||
    mountSourceMemo(() => mount(loader, env), [env, loader])

  return useMountSource(mountSource, options)
}
