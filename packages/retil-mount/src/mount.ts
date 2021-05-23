import { Source, Vector, VectorFusor, map, vectorFuse } from 'retil-source'

import {
  EnvType,
  Loader,
  MountEnv,
  MountSnapshot,
  MountSource,
} from './mountTypes'
import { DependencyList } from './dependencyList'

export function mount<Env extends object, Content>(
  loader: Loader<Env & MountEnv, Content>,
  env: EnvType<Env>,
): MountSource<Env, Content> {
  const vectorSource = vectorFuse((use) => {
    const dependencies = new DependencyList()
    const mountEnv: MountEnv = {
      // TODO: implement abort controller. this probably requires a separate
      // fusor that watches as items appear/disappear in/from the env vector.
      // TODO: if abort controller or suspension list are passed in, "fork"
      // them so the passed in will trigger this abort, and the passed in
      // precache is required to complete this precache.
      abortSignal: undefined as any as AbortSignal,
      dependencies,
    }
    const envSnapshot = (
      typeof env === 'function'
        ? (env as VectorFusor<Env>)(use)
        : Array.isArray(env)
        ? use(env as Source<Env | Vector<Env>>)
        : env
    ) as Env
    const content = loader({
      ...envSnapshot,
      ...mountEnv,
    })
    const snapshot: MountSnapshot<Env, Content> = {
      dependencies,
      env: envSnapshot,
      content,
    }
    return snapshot
  })
  return map(vectorSource, (vectorSnapshot) => vectorSnapshot[1])
}
