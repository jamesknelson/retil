import { loadAsync } from 'retil-mount'
import { loadMatch, loadNotFoundBoundary } from 'retil-nav'

import { DocumentContent } from 'site/src/components/documentContent'

import conceptLoader from './concepts/conceptLoader'
import exampleLoader from './examples/exampleLoader'
import packageLoader from './packages/packageLoader'
import notFoundLoader from './notFoundLoader'

const appLoader = loadNotFoundBoundary(
  loadMatch({
    '/': loadAsync(async () => {
      const { default: Component } = await import(
        '../../../docs/site/index.mdx'
      )
      return <DocumentContent Component={Component} />
    }),
    '/concepts*': conceptLoader,
    '/examples*': exampleLoader,
    '/packages*': packageLoader,
  }),
  notFoundLoader,
)

export default appLoader
