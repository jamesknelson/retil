import '@testing-library/jest-dom/extend-expect'
import React, { Suspense } from 'react'
import { delay } from 'retil-common'
import { createMemoryHistory } from 'retil-history'
import { act, render } from '@testing-library/react'

import {
  RouterController,
  RouterFunction,
  RouterRequest,
  UseRouterOptions,
  getRouterSnapshot,
  routeByPattern,
  routeLazy,
  useRouter as _useRouter,
} from '../src'

function testUseRouter(useRouter: typeof _useRouter) {
  test(`returns content`, () => {
    const router: RouterFunction = () => 'success'
    const Test = () => <>{useRouter(router)[0].content}</>
    const { container } = render(<Test />)
    expect(container).toHaveTextContent('success')
  })

  test(`accepts and transitions via custom history services`, () => {
    const history = createMemoryHistory('/test-1')
    const router: RouterFunction = (request) => request.pathname
    const Test = () => <>{useRouter(router, { history })[0].content}</>
    const { container } = render(<Test />)
    expect(container).toHaveTextContent('/test-1')
    act(() => {
      history[1].navigate('/test-2')
    })
    expect(container).toHaveTextContent('/test-2')
  })

  test(`can transform the request with a transformRequest option`, () => {
    const router: RouterFunction<RouterRequest & { currentUser: string }> = (
      request,
    ) => request.currentUser
    const transformRequest = (request: RouterRequest) => ({
      ...request,
      currentUser: 'james',
    })
    const Test = () => <>{useRouter(router, { transformRequest })[0].content}</>
    const { container } = render(<Test />)
    expect(container).toHaveTextContent('james')
  })

  test(`can specify an initial snapshot to avoid initial loading`, async () => {
    const innerRouter: RouterFunction = (request) => request.pathname
    const router = routeLazy(async () => {
      await delay(10)
      return { default: innerRouter }
    })

    const initialSnapshot = await getRouterSnapshot(router, '/test-1')
    const Test = () => {
      const [route] = useRouter(router, {
        initialSnapshot,
      })
      return <>{route.content}</>
    }
    const { container } = render(<Test />)
    expect(container).toHaveTextContent('/test-1')
  })

  test(`doesn't resolve controller actions until the new route is loaded`, async () => {
    const history = createMemoryHistory('/test-1')
    const innerRouter: RouterFunction = (request) => request.pathname
    const router = routeByPattern({
      '/test-1': innerRouter,
      '/test-2': routeLazy(async () => {
        await delay(10)
        return { default: innerRouter }
      }),
    })
    let controller!: RouterController

    const Test = () => {
      const [route, routerController] = useRouter(router, { history })
      controller = routerController
      return (
        <>
          {route.pending ? 'pending' : ''}
          <Suspense fallback="loading">{route.content}</Suspense>
        </>
      )
    }
    const { container } = render(<Test />)
    let didNavigatePromise!: Promise<boolean>
    expect(container).toHaveTextContent('/test-1')
    act(() => {
      didNavigatePromise = controller.navigate('/test-2')
    })
    expect(container).toHaveTextContent('pending/test-1')
    let didNavigate!: boolean
    await act(async () => {
      didNavigate = await didNavigatePromise
    })
    expect(didNavigate).toBe(true)
    expect(container).toHaveTextContent('/test-2')
  })
}

describe('useRouter (in concurrent mode)', () => {
  const useRouter = (router: RouterFunction, options: UseRouterOptions) =>
    _useRouter(router, { ...options, unstable_isConcurrent: true })

  testUseRouter(useRouter as any)
})

describe('useRouter (in blocking mode)', () => {
  const useRouter = (router: RouterFunction, options: UseRouterOptions) =>
    _useRouter(router, { ...options, unstable_isConcurrent: false })
  testUseRouter(useRouter as any)
})
