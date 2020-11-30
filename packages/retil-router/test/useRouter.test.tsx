import '@testing-library/jest-dom/extend-expect'
import React, { StrictMode, Suspense, useState } from 'react'
import { delay } from 'retil-support'
import { createMemoryHistory } from 'retil-history'
import { act, render, waitFor } from '@testing-library/react'

import {
  CreateRouterRequestServiceOptions,
  RouterFunction,
  RouterProvider,
  RouterRequest,
  RouterState,
  UseRouterOptions,
  createRequest,
  createRequestService,
  getInitialSnapshot,
  routeAsync,
  routeByPattern,
  routeLazy,
  routeRedirect,
  useRouter as _useRouter,
} from '../src'

function createTestRequestService<Ext = {}>(
  path: string,
  options: CreateRouterRequestServiceOptions<Ext> = {},
) {
  const historyService = createMemoryHistory(path)
  return createRequestService({
    historyService,
    ...options,
  })
}

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
    render(<Test />)
    expect(runCount).toBe(1)
  })

  test(`only runs async routes once even in strict mode`, async () => {
    let runCount = 0
    const router: RouterFunction = routeAsync(async () => {
      runCount++
      return 'test'
    })
    const Test = () => <>{useRouter(router).content}</>
    const { container } = render(
      <StrictMode>
        <Suspense fallback={'loading'}>
          <Test />
        </Suspense>
      </StrictMode>,
    )
    expect(container).toHaveTextContent('loading')
    await waitFor(() => {
      expect(runCount).toBe(1)
      expect(container).toHaveTextContent('test')
    })
  })

  test(`can redirect at startup`, async () => {
    const requestService = createTestRequestService('/test-1')
    const router = routeByPattern({
      '/test-1': routeRedirect('/test-2'),
      '/test-2': () => 'done',
    })
    const Test = () => (
      <Suspense fallback={'loading'}>
        {useRouter(router, { requestService }).content}
      </Suspense>
    )
    const { container } = render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
    expect(container).toHaveTextContent('loading')
    await waitFor(() => {
      expect(container).toHaveTextContent('done')
    })
  })

  test(`accepts and transitions via custom history services`, () => {
    const requestService = createTestRequestService('/test-1')
    const router: RouterFunction = (request) => request.pathname
    const Test = () => <>{useRouter(router, { requestService }).content}</>
    const { container } = render(<Test />)
    expect(container).toHaveTextContent('/test-1')
    act(() => {
      requestService[1].navigate('/test-2')
    })
    expect(container).toHaveTextContent('/test-2')
  })

  test(`can use an extended request`, () => {
    const requestService = createTestRequestService('/test-1', {
      extend: () => ({
        currentUser: 'james',
      }),
    })
    const router: RouterFunction<RouterRequest & { currentUser: string }> = (
      request,
    ) => request.currentUser
    const Test = () => <>{useRouter(router, { requestService }).content}</>
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

  test(`changing request services immediately recomputes synchronous routes`, () => {
    const requestService1 = createTestRequestService('/test-1')
    const requestService2 = createTestRequestService('/test-2')
    const router: RouterFunction = (request) => request.pathname
    let setState!: any
    const Test = () => {
      const [state, _setState] = useState({ requestService: requestService1 })
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
      setState({ requestService: requestService2 })
    })
    expect(container).toHaveTextContent('/test-2')
  })
}

describe('useRouter (in concurrent mode)', () => {
  const useRouter = (
    router: RouterFunction,
    options: UseRouterOptions<any, any>,
  ) => _useRouter(router, { ...options, unstable_isConcurrent: true })

  testUseRouter(useRouter as any)

  test(`can specify an initial snapshot to avoid initial loading`, async () => {
    const innerRouter: RouterFunction = (request) => request.pathname
    const router = routeLazy(async () => {
      await delay(10)
      return { default: innerRouter }
    })

    const initialSnapshot = await getInitialSnapshot(
      router,
      createRequest('/test-1'),
    )
    const Test = () => {
      const route = useRouter(router, { initialSnapshot })
      return <>{route.content}</>
    }
    const { container } = render(<Test />)
    expect(container).toHaveTextContent('/test-1')
  })

  // FIXME: Doesn't work right now because the test environment doesn't support
  // concurrent mode
  test.skip(`doesn't resolve controller actions until the new route is loaded`, async () => {
    const requestService = createTestRequestService('/test-1')
    const innerRouter: RouterFunction = (request) => request.pathname
    const router = routeByPattern({
      '/test-1': innerRouter,
      '/test-2': routeLazy(async () => {
        await delay(10)
        return { default: innerRouter }
      }),
    })
    let route!: RouterState
    const Test = () => {
      route = useRouter(router, { requestService })
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
      didNavigatePromise = route.navigate('/test-2')
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
    const requestService = createTestRequestService('/test-1')
    const innerRouter: RouterFunction = (request) => request.pathname
    const router = routeLazy(async () => {
      await delay(10)
      return { default: innerRouter }
    })

    const initialSnapshot = await getInitialSnapshot(
      router,
      createRequest('/test-1'),
    )
    const Test = () => {
      const route = useRouter(router, {
        requestService,
        initialSnapshot,
      })
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
    const requestService = createTestRequestService('/test-1')
    const innerRouter: RouterFunction = (request) => request.pathname
    const router = routeByPattern({
      '/test-1': innerRouter,
      '/test-2': routeLazy(async () => {
        await delay(10)
        return { default: innerRouter }
      }),
    })
    let route!: RouterState

    const Test = () => {
      route = useRouter(router, { requestService })
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
      didNavigatePromise = route.navigate('/test-2')
    })
    expect(container).toHaveTextContent('pending/test-1')
    let didNavigate!: boolean
    await act(async () => {
      didNavigate = await didNavigatePromise
    })
    expect(didNavigate).toBe(true)
    expect(container).toHaveTextContent('/test-2')
  })

  test(`can change routers to an initial redirect without seeing a loading screen`, async () => {
    const requestService = createTestRequestService('/test')
    const router1: RouterFunction = (request) => request.pathname
    const router2 = routeByPattern({
      '/test': routeRedirect('/success'),
      '/success': router1,
    })
    let setState!: any
    const Test = () => {
      const [state, _setState] = useState({ router: router1 })
      setState = _setState
      return <>{useRouter(state.router, { requestService }).content}</>
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

  test(`doesn't cause redirects on outdated routers`, async () => {
    const historyService = createMemoryHistory('/login')
    const router = routeByPattern({
      '/login': (req: { auth: boolean }, res) =>
        req.auth ? routeRedirect('/dashboard')(req as any, res) : 'login',
      '/dashboard': (req: { auth: boolean }, res) =>
        req.auth ? 'dashboard' : routeRedirect('/login')(req as any, res),
    })

    let setRequestService!: any
    const TestRedirectLoop = () => {
      const [requestService, _setRequestService] = useState(() =>
        createRequestService({
          historyService,
          extend: () => ({ auth: false }),
        }),
      )
      setRequestService = _setRequestService
      return (
        <>
          {
            useRouter(router, {
              requestService,
            }).content
          }
        </>
      )
    }
    const { container } = render(
      <StrictMode>
        <TestRedirectLoop />
      </StrictMode>,
    )
    expect(container).toHaveTextContent('login')
    act(() => {
      setRequestService(() =>
        createRequestService({
          historyService,
          extend: () => ({ auth: true }),
        }),
      )
    })
    await waitFor(() => {
      expect(container).toHaveTextContent('dashboard')
    })
  })

  test(`supports waitUntilStable() with redirects`, async () => {
    const requestService = createTestRequestService('/test-1')
    const innerRouter: RouterFunction = (request) => request.pathname
    const router = routeByPattern({
      '/test-1': innerRouter,
      '/test-2': routeLazy(async () => {
        await delay(10)
        return { default: routeRedirect('/test-1') }
      }),
    })
    let route!: RouterState

    const Test = () => {
      route = useRouter(router, { requestService })
      return (
        <RouterProvider value={route}>
          {route.pending ? 'pending' : ''}
          <Suspense fallback="loading">{route.content}</Suspense>
        </RouterProvider>
      )
    }
    const { container } = render(<Test />)
    expect(container).toHaveTextContent(/^\/test-1/)
    act(() => {
      route.navigate('/test-2')
    })
    await act(async () => {
      expect(container).toHaveTextContent('pending/test-1')
      await route.waitUntilNavigationCompletes()
      expect(container).toHaveTextContent(/^\/test-1/)
    })
  })

  test(`calls onResponseComplete when response is complete`, async () => {
    const requestService = createTestRequestService('/test-1')
    const innerRouter: RouterFunction = (request) => request.pathname
    const router = routeByPattern({
      '/test-1': innerRouter,
      '/test-2': routeLazy(async () => {
        await delay(10)
        return { default: routeRedirect('/test-1') }
      }),
    })

    const onResponseComplete = jest.fn()

    const Test = () => {
      const route = useRouter(router, { requestService, onResponseComplete })
      return (
        <RouterProvider value={route}>
          {route.pending ? 'pending' : ''}
          <Suspense fallback="loading">{route.content}</Suspense>
        </RouterProvider>
      )
    }
    render(<Test />)
    await waitFor(() => {
      expect(onResponseComplete).toBeCalled()
    })
  })
})
