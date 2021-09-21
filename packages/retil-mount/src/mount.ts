import { Fusor, Source, fuse, mapVector } from 'retil-source'

import { DependencyList } from './dependencyList'
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
  const source = fuse((use, effect, memo) => {
    const contentRef = {} as { current?: Content }
    const dependencies = new DependencyList()
    const envSnapshot = (
      typeof env === 'function'
        ? (env as Fusor<Env>)(use, effect, memo)
        : Array.isArray(env)
        ? use(env as Source<Env>)
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
  return mapVector(source, ([head, ...tail]) => {
    tail.forEach((snapshot) => {
      // Start fetching dependencies for precache ahead of time
      ;(
        snapshot as MountSnapshotWithContent<Env, Content>
      ).dependencies.resolve()
    })
    return [head]
  })
}
