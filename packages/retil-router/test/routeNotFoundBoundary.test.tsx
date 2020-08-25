import '@testing-library/jest-dom/extend-expect'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { delay } from 'retil-support'

import {
  getInitialStateAndResponse,
  routeByPattern,
  routeLazy,
  routeNotFoundBoundary,
  useRouter,
} from '../src'

describe('routeNotFoundBoundary', () => {
  test(`works during SSR with async routes`, async () => {
    const innerRouter = routeByPattern({
      '/found': (request) => 'found' + request.pathname,
    })
    const router = routeNotFoundBoundary(
      routeLazy(async () => {
        await delay(10)
        return { default: innerRouter }
      }),
      (request) => 'not-found' + request.pathname,
    )

    const [initialState] = await getInitialStateAndResponse(router, '/test-1')
    const Test = () => {
      const route = useRouter(router, { initialState })
      return <>{route.content}</>
    }

    const html = renderToString(<Test />)

    expect(html).toEqual('not-found/test-1')
  })
})
