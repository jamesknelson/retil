/// <reference types="react/experimental" />
/// <reference types="react-dom/experimental" />
/// <reference types="vite/client" />

import React from 'react'
import { unstable_createRoot as createRoot } from 'react-dom'
import { getDefaultBrowserNavigationService, route } from 'retil-router'

import rootRouter from './routers/rootRouter'
import Root from './Root'

const rootNode = document.getElementById('root')!
const reactRoot = createRoot(rootNode, { hydrate: true })
const [
  navigationSource,
  navigationController,
] = getDefaultBrowserNavigationService()
const routeSource = route(rootRouter, navigationSource)

reactRoot.render(
  <Root
    routeSource={routeSource}
    navigationController={navigationController}
  />,
)
