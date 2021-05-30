import React, { ReactElement } from 'react'
import { getSnapshot, subscribe } from 'retil-source'
import { noop } from 'retil-support'

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

  private unsubscribe: null | (() => void) = null

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

    // We'll subscribe to the source to keep it from cleaning up it's cache
    // until the request is sealed.
    this.unsubscribe = subscribe(this.source, noop)

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
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }

    this.loader = undefined as any
    this.env = undefined as any
    this.source = undefined as any
  }
}
