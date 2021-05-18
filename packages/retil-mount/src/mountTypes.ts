import { ReactNode } from 'react'
import { Source, VectorFusor, VectorSource } from 'retil-source'

import { DependencyList } from './dependencyList'

export type EnvType<T extends object> =
  | T
  | Source<T>
  | VectorSource<T>
  | VectorFusor<T>

export type Loader<Env extends object, Content = ReactNode> = (
  env: Env & MountEnv,
) => Content

export interface MountEnv {
  abortSignal: AbortSignal
  dependencies: DependencyList
}

export type MountSnapshot<Env extends object, Content = ReactNode> = {
  dependencies: DependencyList
  env: Env
  content: Content
}

export type MountSource<Env extends object, Content = ReactNode> = Source<
  MountSnapshot<Env, Content>
>

export interface UseMountState<
  Env extends object = object,
  Content = ReactNode,
> {
  env: Env
  content: Content
  pending: boolean
  pendingEnv: Env | null

  /**
   * Returns a promise that will be resolved in a React effect that will be run
   * once the current env has no remaining suspensions.
   */
  waitUntilStable: () => Promise<void>
}
