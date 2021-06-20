import { loadAsync, loadLazy } from 'retil-mount'
import { loadMatch, loadNotFoundBoundary } from 'retil-nav'

import { DocumentContent } from '../components/documentContent'

import examplesLoader from './examples/examplesLoader'
import notFoundLoader from './notFoundLoader'

const appLoader = loadNotFoundBoundary(
  loadMatch({
    '/': loadAsync(async () => {
      const { default: Component } = await import(
        '../../../docs/site/index.mdx'
      )
      return <DocumentContent Component={Component} />
    }),
    '/examples*': examplesLoader,
  }),
  notFoundLoader,
)

export default appLoader
