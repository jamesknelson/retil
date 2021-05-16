import { lazyImport } from 'retil-loader'
import { match, notFoundBoundary } from 'retil-nav'

import { Env } from '../env'

import notFoundLoader from './notFoundLoader'

const rootLoader = notFoundBoundary(
  match<Env>({
    '/': lazyImport(() => import('./landingLoader')),
    '/examples*': lazyImport(() => import('./examples/examplesLoader')),
  }),
  notFoundLoader,
)

export default rootLoader
