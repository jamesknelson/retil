/// <reference types="react/experimental" />
/// <reference types="react-dom/experimental" />
/// <reference types="vite/client" />

import createStyleCache from '@emotion/cache'
import {
  ThemeContext,
  CacheProvider as StyleCacheProvider,
  css,
} from '@emotion/react'
import { hydrateRoot } from 'react-dom'
import { getDefaultHydrationEnvService } from 'retil-hydration'
import { Mount } from 'retil-mount'
import { getDefaultBrowserNavEnvService } from 'retil-nav'
import { fuse } from 'retil-source'
import { CSSProvider } from 'retil-css'

import appLoader from './app/appLoader'
import { App } from './components/app'
import { AppGlobalStyles } from './styles/appGlobalStyles'
import { Head } from './head'
import React from 'react'

const styleCache = createStyleCache({ key: 'sskk' })
const rootNode = document.getElementById('root')!
const [hydrationEnvSource] = getDefaultHydrationEnvService()
const [navEnvSource] = getDefaultBrowserNavEnvService()

const envSource = fuse((use) => {
  const hydrationEnv = use(hydrationEnvSource)
  const navEnv = use(navEnvSource)

  return {
    ...hydrationEnv,
    ...navEnv,
    head: [],
  }
})

hydrateRoot(
  rootNode,
  <React.StrictMode>
    <StyleCacheProvider value={styleCache}>
      <CSSProvider runtime={css} themeContext={ThemeContext}>
        <AppGlobalStyles />
        <Mount loader={appLoader} env={envSource}>
          <Head />
          <App />
        </Mount>
      </CSSProvider>
    </StyleCacheProvider>
  </React.StrictMode>,
)
