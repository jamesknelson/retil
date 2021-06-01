/// <reference types="react/experimental" />
/// <reference types="react-dom/experimental" />
/// <reference types="vite/client" />

import createStyleCache from '@emotion/cache'
import { CacheProvider as StyleCacheProvider } from '@emotion/react'
import { cloneElement } from 'react'
import { createRoot } from 'react-dom'
import { Helmet, HelmetProvider } from 'react-helmet-async'
import { getDefaultHydrationEnvService } from 'retil-hydration'
import { Mount, fuseEnvSource, useEnv } from 'retil-mount'
import { getDefaultBrowserNavEnvService } from 'retil-nav'

import App from './app/App'
import { AppEnv } from './appEnv'
import rootLoader from './loaders/rootLoader'

const styleCache = createStyleCache({ key: 'sskk' })
const rootNode = document.getElementById('root')!
const reactRoot = createRoot(rootNode, { hydrate: true })
const [hydrationEnvSource] = getDefaultHydrationEnvService()
const [navEnvSource] = getDefaultBrowserNavEnvService()

const envSource = fuseEnvSource((use) => {
  const hydrationEnv = use(hydrationEnvSource)
  const navEnv = use(navEnvSource)

  return {
    ...hydrationEnv,
    ...navEnv,
    head: [],
  }
})

function Head() {
  const env = useEnv<AppEnv>()

  return env.hydrating ? null : (
    <HelmetProvider>
      <Helmet>
        {env.head.length ? (
          env.head.map((item, i) => cloneElement(item, { key: i }))
        ) : (
          <title>retil.tech</title>
        )}
      </Helmet>
    </HelmetProvider>
  )
}

reactRoot.render(
  <StyleCacheProvider value={styleCache}>
    <Mount loader={rootLoader} env={envSource}>
      <Head />
      <App />
    </Mount>
  </StyleCacheProvider>,
)
