import React, { ReactNode } from 'react'
import { EnvType, Loader, Mount } from 'retil-mount'

import App from './app/App'
import { Env } from './env'
import GlobalStyles from './globalStyles'

export interface AppProps {
  loader: Loader<Env, ReactNode>
  env: EnvType<Env>
}

function Root(props: AppProps) {
  return (
    <>
      <GlobalStyles />
      <Mount loader={props.loader} env={props.env}>
        <App />
      </Mount>
    </>
  )
}

export default Root
