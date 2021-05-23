import React, { ReactElement } from 'react'
import { getSnapshot } from 'retil-source'

import { mount } from './mount'
import {
  EnvType,
  Loader,
  MountEnv,
  MountSnapshot,
  MountSource,
} from './mountTypes'
import { ServerMountContext } from './serverMountContext'

export class ServerMount<Env extends object, Content> {
  loader: Loader<Env & MountEnv, Content>
  env: EnvType<Env>
  source: MountSource<Env, Content>

  constructor(loader: Loader<Env & MountEnv, Content>, env: EnvType<Env>) {
    this.loader = loader
    this.env = env
  }

  preload(): Promise<MountSnapshot<Env, Content>> {
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
    this.loader = undefined as any
    this.env = undefined as any
    this.source = undefined as any
  }
}
