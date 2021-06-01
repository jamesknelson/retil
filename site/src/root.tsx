import { ReactNode } from 'react'
import { EnvSource, Loader, Mount } from 'retil-mount'

import App from './app/App'
import { AppEnv } from './appEnv'
import GlobalStyles from './globalStyles'

export interface AppProps {
  loader: Loader<AppEnv, ReactNode>
  env: AppEnv | EnvSource<AppEnv>
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
