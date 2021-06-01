import { loadLazy } from 'retil-mount'
import { loadMatch, loadNotFoundBoundary } from 'retil-nav'

import notFoundLoader from './notFoundLoader'

import landingLoader from './landingLoader'

const rootLoader = loadNotFoundBoundary(
  loadMatch({
    '/': landingLoader,
    // '/': loadLazy(() => import('./landingLoader')),
    '/examples*': loadLazy(() => import('./examples/examplesLoader')),
  }),
  notFoundLoader,
)

export default rootLoader
