import { loadAsync } from 'retil-mount'
import { loadMatch, loadNotFoundBoundary } from 'retil-nav'

import { DocumentContent } from 'site/src/components/document'

import conceptLoader from './concept/conceptLoader'
import conceptIndexLoader from './conceptIndex/conceptIndexLoader'
import exampleLoader from './example/exampleLoader'
import exampleIndexLoader from './exampleIndex/exampleIndexLoader'
import packageLoader from './package/packageLoader'
import packageIndexLoader from './packageIndex/packageIndexLoader'

import notFoundLoader from './notFoundLoader'

const appLoader = loadNotFoundBoundary(
  loadMatch({
    '/': loadAsync(async () => {
      const { default: Component } = await import(
        '../../../docs/site/index.mdx'
      )
      return <DocumentContent Component={Component} />
    }),
    '/concepts': conceptIndexLoader,
    '/examples': exampleIndexLoader,
    '/packages*': loadMatch({
      '/': packageIndexLoader,
      '/:packageName*': loadMatch({
        '/': packageLoader,
        '/concepts/:slug': conceptLoader,
        '/examples/:slug': exampleLoader,
      }),
    }),
  }),
  notFoundLoader,
)

export default appLoader
