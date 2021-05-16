import { ReactNode } from 'react'
import { Source } from 'retil-source'

import { DependencyList } from './dependencyList'

export type Loader<Env extends object, Content = ReactNode> = (
  env: Env & LoadEnv,
) => Content

export interface LoadEnv {
  abortSignal: AbortSignal
  dependencies: DependencyList
}

export type RootSnapshot<Env extends object, Content = ReactNode> = {
  dependencies: DependencyList
  env: Env
  content: Content
}

export type RootSource<Env extends object, Content = ReactNode> = Source<
  RootSnapshot<Env, Content>
>

export interface Mount<Env extends object = object, Content = ReactNode> {
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
