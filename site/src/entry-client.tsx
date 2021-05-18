/// <reference types="react/experimental" />
/// <reference types="react-dom/experimental" />
/// <reference types="vite/client" />

import React from 'react'
import { unstable_createRoot as createRoot } from 'react-dom'
import { getDefaultBrowserNavService } from 'retil-nav'

import rootLoader from './screens/rootLoader'
import Root from './root'

const rootNode = document.getElementById('root')!
const reactRoot = createRoot(rootNode, { hydrate: true })
const [navSource] = getDefaultBrowserNavService()

reactRoot.render(<Root env={navSource} loader={rootLoader} />)
