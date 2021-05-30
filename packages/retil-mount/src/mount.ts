import { Source, map } from 'retil-source'

import { DependencyList } from './dependencyList'
import { EnvVector, EnvFusor, fuseEnvSource } from './envSource'
import {
  CastableToEnvSource,
  Loader,
  LoaderProps,
  MountSnapshot,
  MountSnapshotWithContent,
  MountSource,
} from './mountTypes'

export function mount<Env extends object, Content>(
  loader: Loader<Env, Content>,
  env: CastableToEnvSource<Env>,
): MountSource<Env, Content> {
  const vectorSource = fuseEnvSource((use) => {
    const contentRef = {} as { current?: Content }
    const dependencies = new DependencyList()
    const envSnapshot = (
      typeof env === 'function'
        ? (env as EnvFusor<Env>)(use)
        : Array.isArray(env)
        ? use(env as Source<Env | EnvVector<Env>>)
        : env
    ) as Env
    const mountSnapshot: MountSnapshot<Env, Content> = {
      contentRef,
      dependencies,
      env: envSnapshot,
      // TODO: implement abort controller. this probably requires a separate
      // fusor that watches as items appear/disappear in/from the env vector.
      signal: undefined as any as AbortSignal,
    }
    const loaderProps: LoaderProps<Env> = {
      ...envSnapshot,
      mount: mountSnapshot,
    }
    contentRef.current = loader(loaderProps)
    return mountSnapshot as MountSnapshotWithContent<Env, Content>
  })
  return map(vectorSource, (vectorSnapshot) => vectorSnapshot[1])
}
