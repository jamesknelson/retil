import { VectorFusor, map, vectorFuse } from 'retil-source'

import { Loader, LoadEnv, RootSnapshot, RootSource } from './loaderTypes'
import { DependencyList } from './dependencyList'

export function load<Env extends object, Screen>(
  loader: Loader<Env & LoadEnv, Screen>,
  envFusor: VectorFusor<Env>,
): RootSource<Env, Screen> {
  const vectorSource = vectorFuse((use) => {
    const dependencies = new DependencyList()
    const loadEnv: LoadEnv = {
      // TODO: implement abort controller. this probably requires a separate
      // fusor that watches as items appear/disappear in/from the env vector.
      // TODO: if abort controller or suspension list are passed in, "fork"
      // them so the passed in will trigger this abort, and the passed in
      // precache is required to complete this precache.
      abortSignal: undefined as any as AbortSignal,
      dependencies,
    }
    const env = envFusor(use)
    const content = loader({
      ...env,
      ...loadEnv,
    })
    const root: RootSnapshot<Env, Screen> = {
      dependencies,
      env,
      content,
    }
    return root
  })
  return map(vectorSource, (vectorSnapshot) => vectorSnapshot[1])
}
