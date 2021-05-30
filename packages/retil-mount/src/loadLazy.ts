import { loadAsync } from './loadAsync'
import { Loader } from './mountTypes'

export function loadLazy<Env extends object>(
  load: () => PromiseLike<{ default: Loader<Env> }>,
): Loader<Env> {
  let loader: Loader<Env> | undefined

  return loadAsync(async (env) => {
    if (!loader) {
      loader = (await load()).default
    }
    return loader(env)
  })
}
