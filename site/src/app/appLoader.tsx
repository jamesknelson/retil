import { loadAsync } from 'retil-mount'
import { loadMatch, loadNotFoundBoundary } from 'retil-nav'
import { patternFor } from 'retil-nav-scheme'

import { DocumentContent } from 'site/src/component/document'

import conceptLoader from './concepts/conceptLoader'
import exampleLoader from './examples/exampleLoader'
import packageLoader from './packages/packageLoader'

import scheme from './appScheme'
import notFoundLoader from './notFoundLoader'

const appLoader = loadNotFoundBoundary(
  loadMatch({
    [patternFor(scheme.top)]: loadAsync(async () => {
      const { default: Component } = await import(
        '../../../docs/site/index.mdx'
      )
      return <DocumentContent Component={Component} />
    }),

    [patternFor(scheme.concepts)]: conceptLoader,
    [patternFor(scheme.examples)]: exampleLoader,
    [patternFor(scheme.packages)]: packageLoader,
  }),
  notFoundLoader,
)

export default appLoader
