const express = require('express')
const fs = require('fs')
const { readFileSync } = require('fs')
const { join } = require('path')

let filenames = fs.readdirSync(join(process.cwd(), 'site'))

console.log('\nCurrent directory filenames:')
filenames.forEach((file) => {
  console.log(file)
})

filenames = fs.readdirSync(__dirname)

console.log('\fapi directory filenames:')
filenames.forEach((file) => {
  console.log(file)
})

const render = require('../server/entry-server.js').render
const template = readFileSync(join(__dirname, 'index.html'), 'utf-8')

const app = express()

app.use(require('compression')())

app.use('/', async (req, res) => {
  try {
    const result = await render(req, res)

    if (
      res.statusCode >= 300 &&
      res.statusCode < 400 &&
      res.getHeader('Location')
    ) {
      return res.send()
    }

    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Cache-Control', 'no-cache')
    res.end(
      template
        .replace(`<!--app-html-->`, result.appHTML)
        .replace('<!--head-html-->', result.headHTML),
    )
  } catch (e) {
    console.log(e.stack)
    res.status(500).end(e.stack)
  }
})

module.exports = app
