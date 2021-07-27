import { loadAsync } from 'retil-mount'
import { loadMatch, loadNotFoundBoundary } from 'retil-nav'

import { DocumentContent } from 'site/src/components/document'
import { urlPatterns } from 'site/src/utils/urlScheme'

import conceptPageLoader from './concept/conceptLoader'
import conceptIndexLoader from './conceptIndex/conceptIndexLoader'
import examplePageLoader from './example/exampleLoader'
import exampleIndexLoader from './exampleIndex/exampleIndexLoader'
import packagePageLoader from './package/packageLoader'
import packageIndexLoader from './packageIndex/packageIndexLoader'

import notFoundLoader from './notFoundLoader'

const appLoader = loadNotFoundBoundary(
  loadMatch({
    [urlPatterns.landingPage]: loadAsync(async () => {
      const { default: Component } = await import(
        '../../../docs/site/index.mdx'
      )
      return <DocumentContent Component={Component} />
    }),

    [urlPatterns.conceptIndex]: conceptIndexLoader,
    [urlPatterns.conceptPage]: conceptPageLoader,

    [urlPatterns.exampleIndex]: exampleIndexLoader,
    [urlPatterns.examplePage + '/*']: examplePageLoader,

    [urlPatterns.packageIndex]: packageIndexLoader,
    [urlPatterns.packagePage]: packagePageLoader,
  }),
  notFoundLoader,
)

export default appLoader
