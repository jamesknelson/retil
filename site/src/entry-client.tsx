/// <reference types="react/experimental" />
/// <reference types="react-dom/experimental" />
/// <reference types="vite/client" />

import React from 'react'
import { unstable_createRoot as createRoot } from 'react-dom'
import { load } from 'retil-loader'
import { getDefaultBrowserNavService } from 'retil-nav'

import rootLoader from './screens/rootLoader'
import Root from './root'

const [navSource, navController] = getDefaultBrowserNavService()

const rootNode = document.getElementById('root')!
const reactRoot = createRoot(rootNode, { hydrate: true })
const rootSource = load(rootLoader, (use) => {
  return use(navSource)
})

reactRoot.render(<Root navController={navController} rootSource={rootSource} />)
