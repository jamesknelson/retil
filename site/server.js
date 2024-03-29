const compression = require('compression')
const express = require('express')
const fs = require('fs')
const { resolve: resolvePath } = require('path')
const serveStatic = require('serve-static')
const { createServer: createViteServer } = require('vite')

const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD
const port = process.env.PORT || 3000

async function createAppServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === 'production',
) {
  const resolve = (p) => resolvePath(__dirname, p)

  const indexProd = isProd
    ? fs.readFileSync(resolve('dist/server/index.html'), 'utf-8')
    : ''

  const app = express()

  /**
   * @type {import('vite').ViteDevServer}
   */
  let viteDevServer
  if (!isProd) {
    viteDevServer = await createViteServer({
      root,
      logLevel: isTest ? 'error' : 'info',
      server: {
        middlewareMode: 'ssr',
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
    app.use(compression())
    app.use(
      serveStatic(resolve('dist/client'), {
        index: false,
      }),
    )
  }

  app.use('/', async (req, res) => {
    const url = req.originalUrl

    try {
      let template, render
      if (viteDevServer) {
        // always read fresh template in dev
        template = fs.readFileSync(resolve('index.html'), 'utf-8')
        template = await viteDevServer.transformIndexHtml(url, template)
        render = (await viteDevServer.ssrLoadModule('/src/entry-server.tsx'))
          .render
      } else {
        template = indexProd
        render = (await import('./dist/server/entry-server.js')).render
      }

      const result = await render(req, res)

      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.getHeader('Location')
      ) {
        return res.send()
      }

      res.setHeader('Content-Type', 'text/html')
      res.end(
        template
          .replace(`<!--app-html-->`, result.appHTML)
          .replace('<!--head-html-->', result.headHTML),
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
  createAppServer().then(({ app }) =>
    app.listen(port, () => {
      console.log(`Server online at http://localhost:${port}`)
    }),
  )
}

// for test use
// exports.createServer = createAppServer
