/// <reference types="react/experimental" />
/// <reference types="vite/client" />

import type { Request, Response } from 'express'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { ServerMount } from 'retil-mount'
import { getStaticNavEnv } from 'retil-nav'
import { ServerStyleSheet } from 'styled-components'

import Root from './root'
import rootLoader from './screens/rootLoader'

export async function render(
  request: Omit<Request, 'params' | 'query'>,
  response: Response,
) {
  const env = getStaticNavEnv(request, response)

  const sheet = new ServerStyleSheet()
  const mount = new ServerMount(rootLoader, env)

  try {
    await mount.preload()

    if (
      (response.statusCode >= 300 && response.statusCode < 400) ||
      response.statusCode >= 500
    ) {
      return null
    } else {
      const appHTML = ReactDOMServer.renderToString(
        // TODO:
        // The `provide` function will supply a mountSource which will be
        // used when a <Mount> with this rootLoader/envSource is encountered,
        // instead of creating a whole new mountSource
        mount.provide(
          sheet.collectStyles(<Root env={env} loader={rootLoader} />),
        ),
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
    mount.seal()
    sheet.seal()
  }
}
