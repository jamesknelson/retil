import { loadAsync, loadLazy } from 'retil-mount'
import { loadMatch, loadNotFoundBoundary } from 'retil-nav'

import { DocumentContent } from '../components/documentContent'

import conceptLoader from './concepts/conceptLoader'
import exampleLoader from './examples/exampleLoader'
import packageLoader from './packages/packageLoader'
import notFoundLoader from './notFoundLoader'

const inner = loadMatch({
  '/': loadAsync(async () => {
    const { default: Component } = await import('../../../docs/site/index.mdx')
    return <DocumentContent Component={Component} />
  }),
  '/concepts*': conceptLoader,
  '/examples*': exampleLoader,
  '/packages*': packageLoader,
})

const appLoader = loadNotFoundBoundary(inner, notFoundLoader)

export default appLoader
