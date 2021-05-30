import { getSnapshot } from 'retil-source'

import { mount } from './mount'
import { CastableToEnvSource, Loader } from './mountTypes'

export function mountOnce<Env extends object, Content>(
  loader: Loader<Env, Content>,
  env: CastableToEnvSource<Env>,
) {
  const mountSource = mount(loader, env)
  const snapshot = getSnapshot(mountSource)
  return snapshot.dependencies.resolve().then(() => ({
    content: snapshot.contentRef.current,
    env: snapshot.env,
  }))
}
