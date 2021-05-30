/// <reference types="react/experimental" />
/// <reference types="react-dom/experimental" />
/// <reference types="vite/client" />

import createStyleCache from '@emotion/cache'
import { CacheProvider as StyleCacheProvider } from '@emotion/react'
import { createRoot } from 'react-dom'
import { getDefaultBrowserNavEnvService } from 'retil-nav'

import rootLoader from './screens/rootLoader'
import Root from './root'

const styleCache = createStyleCache({ key: 'sskk' })
const rootNode = document.getElementById('root')!
const reactRoot = createRoot(rootNode, { hydrate: true })
const [navSource] = getDefaultBrowserNavEnvService()

reactRoot.render(
  <StyleCacheProvider value={styleCache}>
    <Root env={navSource} loader={rootLoader} />
  </StyleCacheProvider>,
)
