import '@testing-library/jest-dom/extend-expect'
import React, { Suspense } from 'react'
import { delay } from 'retil-common'
import { createMemoryHistory } from 'retil-history'
import { act, render } from '@testing-library/react'

import {
  RouterFunction,
  RouterRequest,
  routeLazy,
  useRouter,
  RouterController,
} from '../src'

describe('useRouter (in concurrent mode)', () => {
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

  // TODO: this requires concurrent mode to test properly
  test.skip(`doesn't resolve controller actions until the new route is loaded`, async () => {
    const history = createMemoryHistory('/test-1')
    const innerRouter: RouterFunction = (request) => request.pathname
    const router = routeLazy(async () => {
      await delay(10)
      return { default: innerRouter }
    })
    let controller!: RouterController
    const Test = () => {
      const [route, routerController] = useRouter(router, { history })
      controller = routerController
      return <Suspense fallback="loading">{route.content}</Suspense>
    }
    const { container } = render(<Test />)
    let didNavigatePromise!: Promise<boolean>
    act(() => {
      didNavigatePromise = controller.navigate('/test-2')
    })
    expect(container).toHaveTextContent('/test-1')
    const didNavigate = await didNavigatePromise
    expect(didNavigate).toBe(true)
    expect(container).toHaveTextContent('/test-2')
  })
})
