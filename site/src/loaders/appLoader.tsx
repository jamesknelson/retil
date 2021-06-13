import { loadAsync, loadLazy } from 'retil-mount'
import { loadMatch, loadNotFoundBoundary } from 'retil-nav'

import { DocumentContent } from '../components/documentContent'

import notFoundLoader from './notFoundLoader'

const appLoader = loadNotFoundBoundary(
  loadMatch({
    '/': loadAsync(async () => {
      const { default: Component } = await import(
        '../../../docs/site/at-a-glance.mdx'
      )
      return <DocumentContent Component={Component} />
    }),
    '/examples*': loadLazy(() => import('./examples/examplesLoader')),
  }),
  notFoundLoader,
)

export default appLoader
