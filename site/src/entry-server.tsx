/// <reference types="react/experimental" />
/// <reference types="vite/client" />

import React from 'react'
import ReactDOMServer from 'react-dom/server'
import {
  createMemoryHistory,
  createRequestService,
  createRouter,
  waitForResponse,
} from 'retil-router'
import { getSnapshot } from 'retil-source'
import { ServerStyleSheet } from 'styled-components'

import rootRouter from './routers/rootRouter'
import Root from './Root'

export async function render(url: string, context: any) {
  const sheet = new ServerStyleSheet()

  try {
    const requestService = createRequestService({
      historyService: createMemoryHistory(url),
    })
    const routerService = createRouter(rootRouter, requestService)
    const response = getSnapshot(routerService[0]).response

    // Wait for any initial suspenses to resolve
    await waitForResponse(response)

    const appHTML = ReactDOMServer.renderToString(
      sheet.collectStyles(<Root routerService={routerService} />),
    )
    const headHTML = `
      <title>retil.tech</title>
      ${sheet.getStyleTags()}
    `

    return {
      appHTML,
      headHTML,
      responseHeaders: response.headers,
      responseStatus: response.status,
    }
  } finally {
    sheet.seal()
  }
}
