import '@testing-library/jest-dom/extend-expect'
import React, { StrictMode, Suspense, useState } from 'react'
import { delay } from 'retil-support'
import { createMemoryHistory } from 'retil-history'
import { act, render } from '@testing-library/react'

import {
  RouterController,
  RouterFunction,
  RouterRequest,
  RouterProvider,
  UseRouterOptions,
  getInitialStateAndResponse,
  routeByPattern,
  routeLazy,
  routeRedirect,
  useRouter as _useRouter,
} from '../src'

function testUseRouter(useRouter: typeof _useRouter) {
  test(`returns content`, () => {
    const router: RouterFunction = () => 'success'
    const Test = () => <>{useRouter(router).content}</>
    const { container } = render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
    expect(container).toHaveTextContent('success')
  })

  test(`only runs the router once`, () => {
    let runCount = 0
    const router: RouterFunction = () => {
      runCount++
      return 'test'
    }
    const Test = () => <>{useRouter(router).content}</>
    render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
    expect(runCount).toBe(1)
  })

  test(`accepts and transitions via custom history services`, () => {
    const history = createMemoryHistory('/test-1')
    const router: RouterFunction = (request) => request.pathname
    const Test = () => <>{useRouter(router, { history }).content}</>
    const { container } = render(<Test />)
    expect(container).toHaveTextContent('/test-1')
    act(() => {
      history[1].navigate('/test-2')
    })
    expect(container).toHaveTextContent('/test-2')
  })

  test(`can transform the request with a transformRequest option`, () => {
    const history = createMemoryHistory('/test-1')
    const router: RouterFunction<RouterRequest & { currentUser: string }> = (
      request,
    ) => request.currentUser
    const transformRequest = (request: RouterRequest) => ({
      ...request,
      currentUser: 'james',
    })
    const Test = () => (
      <>{useRouter(router, { history, transformRequest }).content}</>
    )
    const { container } = render(<Test />)
    expect(container).toHaveTextContent('james')
  })

  test(`can change routers`, () => {
    const router1: RouterFunction = () => 'router-1'
    const router2: RouterFunction = () => 'router-2'
    let setState!: any
    const Test = () => {
      const [state, _setState] = useState({ router: router1 })
      setState = _setState
      return <>{useRouter(state.router).content}</>
    }
    const { container } = render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
    expect(container).toHaveTextContent('router-1')
    act(() => {
      setState({ router: router2 })
    })
    expect(container).toHaveTextContent('router-2')
  })

  test(`changing histories immediately recomputes synchronous routes`, () => {
    const history1 = createMemoryHistory('/test-1')
    const history2 = createMemoryHistory('/test-2')
    const router: RouterFunction = (request) => request.pathname
    let setState!: any
    const Test = () => {
      const [state, _setState] = useState({ history: history1 })
      setState = _setState
      return <>{useRouter(router, state).content}</>
    }
    const { container } = render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
    expect(container).toHaveTextContent('/test-1')
    act(() => {
      setState({ history: history2 })
    })
    expect(container).toHaveTextContent('/test-2')
  })

  test(`can change routers to an initial redirect without seeing a loading screen`, async () => {
    const history = createMemoryHistory('/test')
    const router1: RouterFunction = (request) => request.pathname
    const router2 = routeByPattern({
      '/test': routeRedirect('/success'),
      '/success': router1,
    })
    let setState!: any
    const Test = () => {
      const [state, _setState] = useState({ router: router1 })
      setState = _setState
      return <>{useRouter(state.router, { history }).content}</>
    }
    const { container } = render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
    expect(container).toHaveTextContent('/test')
    await act(async () => {
      setState({ router: router2 })
    })
    expect(container).toHaveTextContent('/success')
  })
}

describe('useRouter (in concurrent mode)', () => {
  const useRouter = (
    router: RouterFunction,
    options: UseRouterOptions<any, any>,
  ) => _useRouter(router, { ...options, unstable_isConcurrent: true })

  testUseRouter(useRouter as any)

  // FIXME: Doesn't work right now because the test environment doesn't support
  // concurrent mode
  test.skip(`can specify an initial snapshot to avoid initial loading`, async () => {
    const innerRouter: RouterFunction = (request) => request.pathname
    const router = routeLazy(async () => {
      await delay(10)
      return { default: innerRouter }
    })

    const [initialState] = await getInitialStateAndResponse(router, '/test-1')
    const Test = () => {
      const route = useRouter(router, { initialState })
      return <>{route.content}</>
    }
    const { container } = render(<Test />)
    expect(container).toHaveTextContent('/test-1')
  })

  // FIXME: Doesn't work right now because the test environment doesn't support
  // concurrent mode
  test.skip(`doesn't resolve controller actions until the new route is loaded`, async () => {
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
      const route = useRouter(router, { history })
      controller = route.controller
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
})

describe('useRouter (in blocking mode)', () => {
  const useRouter = (
    router: RouterFunction,
    options: UseRouterOptions<any, any>,
  ) => _useRouter(router, { ...options, unstable_isConcurrent: false })

  testUseRouter(useRouter as any)

  test(`can specify an initial snapshot to avoid initial loading`, async () => {
    const history = createMemoryHistory('/test-1')
    const innerRouter: RouterFunction = (request) => request.pathname
    const router = routeLazy(async () => {
      await delay(10)
      return { default: innerRouter }
    })

    const [initialState] = await getInitialStateAndResponse(router, '/test-1')
    const Test = () => {
      const route = useRouter(router, { history, initialState })
      return <>{route.content}</>
    }
    const { container } = render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
    expect(container).toHaveTextContent('/test-1')
    await act(async () => {})
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
      const route = useRouter(router, { history })
      controller = route.controller
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

  test(`supports waitUntilStable() with redirects`, async () => {
    const history = createMemoryHistory('/test-1')
    const innerRouter: RouterFunction = (request) => request.pathname
    const router = routeByPattern({
      '/test-1': innerRouter,
      '/test-2': routeLazy(async () => {
        await delay(10)
        return { default: routeRedirect('/test-1') }
      }),
    })
    let controller!: RouterController

    const Test = () => {
      const route = useRouter(router, { history })
      controller = route.controller
      return (
        <RouterProvider value={route}>
          {route.pending ? 'pending' : ''}
          <Suspense fallback="loading">{route.content}</Suspense>
        </RouterProvider>
      )
    }
    const { container } = render(<Test />)
    expect(container).toHaveTextContent('/test-1')
    act(() => {
      controller.navigate('/test-2')
    })
    expect(container).toHaveTextContent('pending/test-1')
    await act(async () => {
      await controller.waitUntilStable()
    })
    expect(container).toHaveTextContent('/test-1')
  })

  test(`calls onResponseComplete when response is complete`, async () => {
    const history = createMemoryHistory('/test-1')
    const innerRouter: RouterFunction = (request) => request.pathname
    const router = routeByPattern({
      '/test-1': innerRouter,
      '/test-2': routeLazy(async () => {
        await delay(10)
        return { default: routeRedirect('/test-1') }
      }),
    })
    let controller!: RouterController

    const onResponseComplete = jest.fn()

    const Test = () => {
      const route = useRouter(router, { history, onResponseComplete })
      controller = route.controller
      return (
        <RouterProvider value={route}>
          {route.pending ? 'pending' : ''}
          <Suspense fallback="loading">{route.content}</Suspense>
        </RouterProvider>
      )
    }
    render(<Test />)
    await act(async () => {
      await controller.waitUntilStable()
    })
    expect(onResponseComplete).toBeCalled()
  })

  test(`doens't cause redirects on outdated routers`, () => {
    const history = createMemoryHistory('/login')
    const router = routeByPattern({
      '/login': (req: { auth: boolean }, res) =>
        req.auth ? routeRedirect('/dashboard')(req as any, res) : 'login',
      '/dashboard': (req: { auth: boolean }, res) =>
        req.auth ? 'dashboard' : routeRedirect('/login')(req as any, res),
    })

    let setTransformRequest!: any
    const Test = () => {
      const [transformRequest, _setTransformRequest] = useState(
        () => (request: any) => ({
          ...request,
          auth: false,
        }),
      )
      setTransformRequest = _setTransformRequest
      return <>{useRouter(router, { history, transformRequest }).content}</>
    }
    const { container } = render(<Test />)
    expect(container).toHaveTextContent('login')
    act(() => {
      setTransformRequest(() => (request: any) => ({
        ...request,
        auth: true,
      }))
    })
    expect(container).toHaveTextContent('dashboard')
  })
})
