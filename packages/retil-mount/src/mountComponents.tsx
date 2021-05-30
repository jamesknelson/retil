import React, { ReactElement, ReactNode } from 'react'

import { MountProvider, useMountContent } from './mountContext'
import { CastableToEnvSource, Loader } from './mountTypes'
import { useMount } from './useMount'
import { UseMountSourceOptions } from './useMountSource'

export interface MountProps<Env extends object, Content>
  extends UseMountSourceOptions {
  children: ReactNode
  loader: Loader<Env, Content>
  env: CastableToEnvSource<Env>
}

export function Mount<Env extends object, Content>(
  props: MountProps<Env, Content>,
) {
  const { children, loader, env } = props
  const mount = useMount(loader, env)
  return <MountProvider value={mount}>{children}</MountProvider>
}

export function MountedContent() {
  // Cast this to ReactElement to appease TypeScript.
  return useMountContent() as ReactElement
}
