/// <reference types="@retil/tool-vite-plugin-code-as-content/client" />
/// <reference types="react/next" />
/// <reference types="vite/client" />

import createStyleCache from '@emotion/cache'
import createEmotionServer from '@emotion/server/create-instance'
import { Request, Response } from 'express'
import { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { ServerMount } from 'retil-mount'
import { createHref, createServerNavEnv } from 'retil-nav'
import { ServerStyleSheet } from 'styled-components'

import { App } from './app/app'
import appLoader from './app/appLoader'
import { createHeadSink, renderHeadSinkToString } from './head'

export async function render(
  request: Omit<Request, 'params' | 'query'>,
  response: Response,
) {
  const head = [] as ReactElement[]
  const env = {
    ...createServerNavEnv(request, response),
    head,
  }

  if (request.path !== env.nav.pathname) {
    response.statusCode = 308
    response.setHeader('Location', createHref(env.nav))
    return null
  }

  const sheet = new ServerStyleSheet()
  const mount = new ServerMount(appLoader, env)
  const styleCache = createStyleCache({ key: 'sskk' })
  const { extractCriticalToChunks, constructStyleTagsFromChunks } =
    createEmotionServer(styleCache)

  try {
    await mount.preload()

    if (
      (response.statusCode >= 300 && response.statusCode < 400) ||
      response.statusCode >= 500
    ) {
      return null
    } else {
      const headSink = createHeadSink()
      const { html: appHTML, styles: appStyles } = extractCriticalToChunks(
        renderToString(
          sheet.collectStyles(
            mount.provide(
              <App env={env} headSink={headSink} styleCache={styleCache} />,
            ),
          ),
        ),
      )
      const headHTML = [
        renderHeadSinkToString(headSink),
        constructStyleTagsFromChunks({ html: appHTML, styles: appStyles }),
        sheet.getStyleTags(),
      ].join('\n')

      return {
        appHTML,
        headHTML,
      }
    }
  } finally {
    sheet.seal()
    mount.seal()
  }
}
