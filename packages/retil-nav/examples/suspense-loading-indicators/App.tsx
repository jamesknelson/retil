import React from 'react'

import { Link } from 'retil-link'
import {
  EnvSource,
  Mount,
  MountedContent,
  loadAsync,
  useMountPending,
} from 'retil-mount'
import { loadMatch, NavEnv } from 'retil-nav'
import { delay } from 'retil-support'

export interface AppEnv extends NavEnv {}

export const appLoader = loadMatch<AppEnv>({
  '/': loadAsync(async () => {
    await delay(1000)
    return <h1>Welcome!</h1>
  }),
  '/about': loadAsync(async () => {
    await delay(1000)
    return <h1>About</h1>
  }),
})

export interface AppProps {
  env: AppEnv | EnvSource<AppEnv>
}

export const App: React.FunctionComponent<AppProps> = ({ env }) => {
  return (
    <Mount env={env} loader={appLoader} transitionTimeoutMs={500}>
      <nav>
        <Link to="/">Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/about">About</Link>
      </nav>
      <main>
        <React.Suspense fallback="loading fallback...">
          <RouterPendingIndicator />
          <MountedContent />
        </React.Suspense>
      </main>
    </Mount>
  )
}

function RouterPendingIndicator() {
  const pending = useMountPending()
  return <>{pending && 'loading concurrently...'}</>
}
