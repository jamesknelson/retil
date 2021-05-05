/// <reference types="react/experimental" />
/// <reference types="react-dom/experimental" />
/// <reference types="vite/client" />

import React from 'react'
import { unstable_createRoot as createRoot } from 'react-dom'
import { createRequestService, createRouter } from 'retil-router'

import rootRouter from './routers/rootRouter'
import Root from './Root'

const rootNode = document.getElementById('root')!
const reactRoot = createRoot(rootNode, { hydrate: true })

const requestService = createRequestService()

const routerService = createRouter(rootRouter, requestService)

reactRoot.render(<Root routerService={routerService} />)
