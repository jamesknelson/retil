/// <reference types="react/experimental" />
/// <reference types="vite/client" />

import type { Request, Response } from 'express'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { loadOnce } from 'retil-loader'
import { getStaticNavEnv } from 'retil-nav'
import { ServerStyleSheet } from 'styled-components'

import Root from './root'
import rootLoader from './screens/rootLoader'

export async function render(
  request: Omit<Request, 'params' | 'query'>,
  response: Response,
) {
  const sheet = new ServerStyleSheet()

  try {
    const env = getStaticNavEnv(request, response)
    const rootSource = await loadOnce(rootLoader, env)

    if (
      (response.statusCode >= 300 && response.statusCode < 400) ||
      response.statusCode >= 500
    ) {
      return null
    } else {
      const appHTML = ReactDOMServer.renderToString(
        sheet.collectStyles(<Root rootSource={rootSource} />),
      )
      const headHTML = `
        <title>retil.tech</title>
        ${sheet.getStyleTags()}
      `

      return {
        appHTML,
        headHTML,
      }
    }
  } finally {
    sheet.seal()
  }
}
