import React, { ReactNode } from 'react'
import { EnvType, Loader, MountProvider, useMount } from 'retil-mount'
import { NavProvider } from 'retil-nav'

import App from './app/App'
import { Env } from './env'
// import GlobalStyles from './globalStyles'

export interface AppProps {
  loader: Loader<Env, ReactNode>
  env: EnvType<Env>
}

function Root(props: AppProps) {
  const { env, loader } = props

  // FIXME:
  // The retil site uses a raw `useMount` instead of a <Mount>` component so
  // that a <NavProvider env> can manually be rendered -- which resolves some
  // issues caused by ts-node during development. However, fixing the build
  // process should make this unnecessary.
  const mount = useMount(loader, env)

  return (
    <>
      {/* <GlobalStyles /> */}
      <MountProvider value={mount}>
        <NavProvider env={mount.env}>
          <App />
        </NavProvider>
      </MountProvider>
    </>
  )
}

export default Root
