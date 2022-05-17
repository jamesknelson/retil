import React from 'react'

import { Boundary } from 'retil-boundary'
import { MatchedLinkSurface } from 'retil-interaction'
import {
  Mount,
  MountedContent,
  loadAsync,
  useMountPending,
  useMountPendingEnv,
  useMountEnv,
} from 'retil-mount'
import { loadMatch, NavEnv } from 'retil-nav'
import { Source } from 'retil-source'
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
  env: AppEnv | Source<AppEnv>
}

export const App: React.FunctionComponent<AppProps> = ({ env }) => {
  return (
    <Mount env={env} loader={appLoader} transitionTimeoutMs={500}>
      <nav>
        <MatchedLinkSurface href="/">Home</MatchedLinkSurface>
        &nbsp;&middot;&nbsp;
        <MatchedLinkSurface href="/about">About</MatchedLinkSurface>
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
  const env = useMountEnv<AppEnv>()
  const pendingEnv = useMountPendingEnv<AppEnv>()
  const loading =
    pending && (!pendingEnv || pendingEnv.nav.pathname !== env.nav.pathname)
  return <>{loading && 'loading concurrently...'}</>
}
