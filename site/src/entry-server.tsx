/// <reference types="react/experimental" />
/// <reference types="vite/client" />

import createStyleCache from '@emotion/cache'
import {
  CacheProvider as StyleCacheProvider,
  ThemeContext,
  css,
} from '@emotion/react'
import createEmotionServer from '@emotion/server/create-instance'
import { Request, Response } from 'express'
import { ReactElement, cloneElement } from 'react'
import { renderToString } from 'react-dom/server'
import { Helmet, HelmetData, HelmetProvider } from 'react-helmet-async'
import { Mount, ServerMount } from 'retil-mount'
import { createHref, createServerNavEnv } from 'retil-nav'
import { CSSProvider } from 'retil-css'
import { ServerStyleSheet } from 'styled-components'

import { App } from './components/app'
import { AppGlobalStyles } from './styles/appGlobalStyles'
import appLoader from './loaders/appLoader'

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
      const { html: appHTML, styles: appStyles } = extractCriticalToChunks(
        renderToString(
          sheet.collectStyles(
            mount.provide(
              <StyleCacheProvider value={styleCache}>
                <CSSProvider runtime={css} themeContext={ThemeContext}>
                  <AppGlobalStyles />
                  <Mount loader={appLoader} env={env}>
                    <App />
                  </Mount>
                </CSSProvider>
              </StyleCacheProvider>,
            ),
          ),
        ),
      )

      const helmetContext = {} as { helmet: HelmetData }
      renderToString(
        <HelmetProvider context={helmetContext}>
          <Helmet>
            {head.length ? (
              head.map((item, i) => cloneElement(item, { key: i }))
            ) : (
              <title>retil.tech</title>
            )}
          </Helmet>
        </HelmetProvider>,
      )

      const styledComponentsStyleTags = sheet.getStyleTags()
      const headHTML = `
        ${helmetContext.helmet.title.toString()}
        ${helmetContext.helmet.meta.toString()}
        ${helmetContext.helmet.script.toString()}
        ${helmetContext.helmet.style.toString()}
        ${constructStyleTagsFromChunks({ html: appHTML, styles: appStyles })}
        ${styledComponentsStyleTags}
      `

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
