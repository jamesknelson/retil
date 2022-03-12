import * as React from 'react'
import { RouterFunction } from 'retil-router'

import { NextilRequest, NextilResponse } from './nextilTypes'

const defaultNotFoundRouter = () => (
  <div>
    <h1>404 Not Found</h1>
  </div>
)

export const notFoundRouterRef: {
  current: RouterFunction<NextilRequest, NextilResponse>
} = {
  current: defaultNotFoundRouter,
}
