import React from 'react'

import { Link } from 'retil-link'
import { Boundary } from 'retil-boundary'
import {
  EnvSource,
  Mount,
  MountedContent,
  loadAsync,
  useMountPending,
  usePendingEnv,
  useEnv,
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
        <Boundary fallback="loading fallback...">
          <RouterPendingIndicator />
          <MountedContent />
        </Boundary>
      </main>
    </Mount>
  )
}

function RouterPendingIndicator() {
  const pending = useMountPending()
  const env = useEnv<AppEnv>()
  const pendingEnv = usePendingEnv<AppEnv>()
  const loading =
    pending && (!pendingEnv || pendingEnv.nav.pathname !== env.nav.pathname)
  return <>{loading && 'loading concurrently...'}</>
}
