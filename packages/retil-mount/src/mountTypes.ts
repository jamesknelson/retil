import { ReactNode } from 'react'
import { Source } from 'retil-source'

import { DependencyList } from './dependencyList'
import { EnvFusor, EnvSource } from './envSource'

export type CastableToEnvSource<T extends object> =
  | T
  | Source<T>
  | EnvFusor<T>
  | EnvSource<T>

export type LoaderProps<Env extends object> = Env & {
  mount: MountSnapshot<Env, unknown>
}

export type Loader<Env extends object, Content = ReactNode> = (
  props: LoaderProps<Env>,
) => Content

export interface MountContentRef<Content = ReactNode> {
  readonly current?: Content
}

export interface MountSnapshot<Env extends object, Content = ReactNode> {
  dependencies: DependencyList
  env: Env
  contentRef: MountContentRef<Content>
  signal: AbortSignal
}

export interface MountSnapshotWithContent<
  Env extends object,
  Content = ReactNode,
> extends MountSnapshot<Env, Content> {
  contentRef: { readonly current: Content }
}

export type MountSource<Env extends object, Content = ReactNode> = Source<
  MountSnapshotWithContent<Env, Content>
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
