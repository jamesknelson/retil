/// <reference types="react/experimental" />
/// <reference types="vite/client" />

import createStyleCache from '@emotion/cache'
import { CacheProvider as StyleCacheProvider } from '@emotion/react'
import createEmotionServer from '@emotion/server/create-instance'
import { Request, Response } from 'express'
import { renderToString } from 'react-dom/server'
import { ServerMount } from 'retil-mount'
import { createHref, createServerNavEnv } from 'retil-nav'

import Root from './root'
import rootLoader from './screens/rootLoader'

export async function render(
  request: Omit<Request, 'params' | 'query'>,
  response: Response,
) {
  const env = createServerNavEnv(request, response)

  if (request.path !== env.nav.pathname) {
    response.statusCode = 308
    response.setHeader('Location', createHref(env.nav))
    return null
  }

  const mount = new ServerMount(rootLoader, env)
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
      const { html: appHTML, styles: appStyles } = extractCriticalToChunks(
        renderToString(
          mount.provide(
            <StyleCacheProvider value={styleCache}>
              <Root loader={rootLoader} env={env} />
            </StyleCacheProvider>,
          ),
        ),
      )
      const headHTML = `
        <title>retil.tech</title>
        ${constructStyleTagsFromChunks({ html: appHTML, styles: appStyles })}
      `

      return {
        appHTML,
        headHTML,
      }
    }
  } finally {
    mount.seal()
  }
}
