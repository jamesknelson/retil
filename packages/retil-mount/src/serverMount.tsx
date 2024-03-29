import React, { ReactElement } from 'react'
import { getSnapshot } from 'retil-source'

import { mount } from './mount'
import {
  CastableToEnvSource,
  Loader,
  MountSnapshotWithContent,
  MountSource,
} from './mountTypes'
import { ServerMountContext } from './serverMountContext'

export class ServerMount<Env extends object, Content> {
  loader: Loader<Env, Content>
  env: CastableToEnvSource<Env>
  source: MountSource<Env, Content>

  constructor(loader: Loader<Env, Content>, env: CastableToEnvSource<Env>) {
    this.loader = loader
    this.env = env
  }

  preload(): Promise<MountSnapshotWithContent<Env, Content>> {
    if (this.source) {
      throw new Error(
        `The "preload" method of ServerMount may only be called once.`,
      )
    }

    this.source = mount(this.loader, this.env)

    const snapshot = getSnapshot(this.source)
    return snapshot.dependencies.resolve().then(() => snapshot)
  }

  provide(element: ReactElement): ReactElement {
    if (!this.source) {
      throw new Error(
        `The "provide" method of ServerMount must be called *after* "preload" has been called.`,
      )
    }

    return (
      <ServerMountContext.Provider value={this}>
        {element}
      </ServerMountContext.Provider>
    )
  }

  seal(): void {
    // This is part of the API in case it turns out to be needed. But for now,
    // so long as the env is a constant source, I don't think we *do* need to
    // clean up.
  }
}
