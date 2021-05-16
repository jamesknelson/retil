import { fuse } from 'retil-source'

import { Loader, RootSnapshot, LoadEnv, RootSource } from './loaderTypes'
import { DependencyList } from './dependencyList'

export function loadOnce<Env extends object, Content>(
  loader: Loader<Env & LoadEnv, Content>,
  env: Env,
): Promise<RootSource<Env, Content>> {
  const dependencies = new DependencyList()
  const loadEnv: LoadEnv = {
    // TODO: implement abort controller. this probably requires a separate
    // fusor that watches as items appear/disappear in/from the env vector.
    // TODO: if abort controller or suspension list are passed in, "fork" them
    // so the passed in will trigger this abort, and the passed in precache is
    // required to complete this precache.
    abortSignal: undefined as any as AbortSignal,
    dependencies,
  }
  const content = loader({
    ...env,
    ...loadEnv,
  })
  const load: RootSnapshot<Env, Content> = {
    dependencies,
    env,
    content,
  }
  const source = fuse(() => load)
  return dependencies.resolve().then(() => source)
}
