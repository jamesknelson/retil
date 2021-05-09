/// <reference types="react/experimental" />
/// <reference types="vite/client" />

import type { Request, Response } from 'express'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { getServerSideRoutingEnvironment, routeOnce } from 'retil-router'
import { ServerStyleSheet } from 'styled-components'

import rootRouter from './routers/rootRouter'
import Root from './Root'

export async function render(request: Request, response: Response) {
  const sheet = new ServerStyleSheet()

  try {
    const environment = getServerSideRoutingEnvironment(request, response)
    const routeSource = await routeOnce(rootRouter, environment)

    if (
      (response.statusCode >= 300 && response.statusCode < 400) ||
      response.statusCode >= 500
    ) {
      return null
    } else {
      const appHTML = ReactDOMServer.renderToString(
        sheet.collectStyles(<Root routeSource={routeSource} />),
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
