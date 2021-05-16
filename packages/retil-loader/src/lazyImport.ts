import { lazy } from './lazy'
import { Loader } from './loaderTypes'

export function lazyImport<Env extends object>(
  load: () => PromiseLike<{ default: Loader<Env> }>,
): Loader<Env> {
  let loader: Loader<Env> | undefined

  return lazy(async (env) => {
    if (!loader) {
      loader = (await load()).default
    }
    return loader(env)
  })
}
