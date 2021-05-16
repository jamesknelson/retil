import React from 'react'
import { MountProvider, RootSource, useMount } from 'retil-loader'
import { NavController, NavProvider } from 'retil-nav'

import App from './app/App'
import { Env } from './env'
import GlobalStyles from './globalStyles'

export interface AppProps {
  navController?: NavController
  rootSource: RootSource<Env>
}

function Root(props: AppProps) {
  const { navController, rootSource } = props
  const mount = useMount(rootSource)

  return (
    <>
      <GlobalStyles />
      <MountProvider value={mount}>
        <NavProvider env={mount.env} controller={navController}>
          <App />
        </NavProvider>
      </MountProvider>
    </>
  )
}

export default Root
