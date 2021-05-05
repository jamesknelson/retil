import type { ViteDevServer } from 'vite'

import * as fs from 'fs'
import * as path from 'path'

const express = require('express') as typeof import('express')

const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD

async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === 'production',
) {
  const resolve = (p: string) => path.resolve(__dirname, p)

  const indexProd = isProd
    ? fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
    : ''

  const app = express()

  /**
   * @type {import('vite').ViteDevServer}
   */
  let viteDevServer: ViteDevServer | undefined
  if (!isProd) {
    const { createServer } = require('vite') as typeof import('vite')
    viteDevServer = await createServer({
      root,
      logLevel: isTest ? 'error' : 'info',
      server: {
        middlewareMode: true,
        watch: {
          // During tests we edit the files too fast and sometimes chokidar
          // misses change events, so enforce polling for consistency
          usePolling: true,
          interval: 100,
        },
      },
    })
    // use vite's connect instance as middleware
    app.use(viteDevServer.middlewares)
  } else {
    app.use(require('compression')())
    app.use(
      require('serve-static')(resolve('dist/client'), {
        index: false,
      }),
    )
  }

  app.use('*', async (req, res) => {
    try {
      const url = req.originalUrl

      let template, render
      if (viteDevServer) {
        // always read fresh template in dev
        template = fs.readFileSync(resolve('index.html'), 'utf-8')
        template = await viteDevServer.transformIndexHtml(url, template)
        render = (await viteDevServer.ssrLoadModule('/src/entry-server.tsx'))
          .render
      } else {
        template = indexProd
        render = require('./dist/server/entry-server.js').render
      }

      const context = {}
      const {
        appHTML,
        headHTML,
        responseHeaders = {} as Record<string, string>,
        responseStatus = 200,
      } = await render(url, context)

      if (
        responseStatus >= 300 &&
        responseStatus < 400 &&
        responseHeaders.Location
      ) {
        return res.redirect(responseStatus, responseHeaders.Location)
      }

      responseHeaders['Content-Type'] = 'text/html'
      res
        .status(responseStatus)
        .set(responseHeaders)
        .end(
          template
            .replace(`<!--app-html-->`, appHTML)
            .replace('<!--head-html-->', headHTML),
        )
    } catch (e) {
      if (viteDevServer) {
        viteDevServer.ssrFixStacktrace(e)
      }
      console.log(e.stack)
      res.status(500).end(e.stack)
    }
  })

  return { app, vite: viteDevServer }
}

if (!isTest) {
  createServer().then(({ app }) =>
    app.listen(3000, () => {
      console.log('http://localhost:3000')
    }),
  )
}

// for test use
exports.createServer = createServer
