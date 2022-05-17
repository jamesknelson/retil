import { ReactElement } from 'react'
import { ServerMount } from 'retil-mount'
import {
  createServerNavEnv,
  NavEnvService,
  NavRequest,
  NavResponse,
} from 'retil-nav'

import { App, appLoader } from './app'

export async function clientMain(
  render: (element: ReactElement) => void,
  getDefaultBrowserNavEnvService: () => NavEnvService,
) {
  const [navEnvSource] = getDefaultBrowserNavEnvService()

  render(<App env={navEnvSource} />)
}

export async function serverMain(
  render: (element: ReactElement) => void,
  request: NavRequest,
  response: NavResponse,
) {
  const env = createServerNavEnv(request, response)
  const mount = new ServerMount(appLoader, env)
  try {
    await mount.preload()
    render(mount.provide(<App env={env} />))
  } finally {
    mount.seal()
  }
}
