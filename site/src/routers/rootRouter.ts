import {
  routeByPattern,
  routeLazy,
  routeNotFoundBoundary,
  RouterResponse,
} from 'retil-router'

import { AppContext } from '../appContext'

import notFoundRouter from './notFoundRouter'

const rootRouter = routeNotFoundBoundary(
  routeByPattern<AppContext, RouterResponse>({
    '/': routeLazy(() => import('./landingRouter')),
    '/examples*': routeLazy(() => import('./examples/examplesRouter')),
  }),
  notFoundRouter,
)

export default rootRouter
