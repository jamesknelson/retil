import '@testing-library/jest-dom/extend-expect'
import React, { StrictMode, Suspense, useState } from 'react'
import { createState, getSnapshot, fuse, createStateVector } from 'retil-source'
import { Deferred, delay, pendingPromiseLike } from 'retil-support'
import { act, render, waitFor } from '@testing-library/react'

import {
  DependencyList,
  LoaderProps,
  UseMountState,
  mount,
  useMountSource,
} from '../src'

const getEmptyEnv = () => ({})

const SuspendForUnresolvedDependencies = ({
  children,
  dependencies,
}: {
  children: React.ReactNode
  dependencies: DependencyList
}) => {
  if (dependencies.unresolved) {
    throw dependencies.resolve()
  } else {
    return <>{children}</>
  }
}

describe('useMountSource', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  test(`returns content`, () => {
    const rootSource = mount(() => 'success', getEmptyEnv)
    const Test = () => <>{useMountSource(rootSource).content}</>
    const { container } = render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
    expect(container).toHaveTextContent('success')
  })

  test(`only runs the loader once`, () => {
    let runCount = 0
    const rootSource = mount(() => {
      runCount++
      return 'test'
    }, getEmptyEnv)
    const Test = () => <>{useMountSource(rootSource).content}</>
    render(<Test />)
    expect(runCount).toBe(1)
  })

  test(`throws an error when mounting a source in error state`, () => {
    const rootSource = mount(() => {
      throw new Error('errortest')
    }, getEmptyEnv)
    const Test = () => {
      let result: string
      try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        result = useMountSource(rootSource).content
      } catch (error: any) {
        result = error.message
      }
      return <>{result}</>
    }
    const { container } = render(<Test />)
    expect(container).toHaveTextContent('errortest')
  })

  test(`throws an error when a mounted source changes to error state`, async () => {
    const [stateSource, setState] = createState({ pathname: '/start' })
    const deferred = new Deferred()
    const envSource = fuse((use, act) => {
      const state = use(stateSource)
      if (state.pathname === '/start') {
        return state
      } else {
        return act(() => deferred.promise)
      }
    })
    const rootSource = mount((env) => <>{env.pathname}</>, envSource)
    const Test = () => {
      let result: any
      try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        result = useMountSource(rootSource).content
      } catch (error: any) {
        result = error.message
      }
      return result
    }
    const { container } = render(<Test />)

    expect(container).toHaveTextContent('/start')

    await act(async () => {
      setState({ pathname: '/end' })
      await Promise.resolve()
      await deferred.reject(new Error('errortest'))
    })

    expect(container).toHaveTextContent('errortest')
  })

  test(`lazily executes suspending sources just once, even in strict mode`, async () => {
    let runCount = 0
    let deferred: Deferred = new Deferred()
    const rootSource = mount((env) => {
      runCount++
      env.mount.dependencies.add(deferred.promise)
      return (
        <SuspendForUnresolvedDependencies dependencies={env.mount.dependencies}>
          test
        </SuspendForUnresolvedDependencies>
      )
    }, getEmptyEnv)
    const Test = () => <>{useMountSource(rootSource).content}</>
    const { container } = render(
      <StrictMode>
        <Suspense fallback={'loading'}>
          <Test />
        </Suspense>
      </StrictMode>,
    )
    expect(container).toHaveTextContent('loading')
    await act(async () => {
      deferred.resolve(true)
    })
    expect(runCount).toBe(1)
    expect(container).toHaveTextContent('test')
  })

  test(`can suspend to update env at startup`, async () => {
    const [envSource, setEnv] = createState({ pathname: '/start' })
    const deferred: Deferred = new Deferred()
    const redirect = async (pathname: string) => {
      await deferred.promise
      setEnv({ pathname })
    }

    const rootSource = mount(
      (env: LoaderProps<{ pathname: string }>) => {
        if (env.pathname === '/start') {
          env.mount.dependencies.add(redirect('/complete'))
        }
        return (
          <SuspendForUnresolvedDependencies
            dependencies={env.mount.dependencies}>
            {env.pathname}
          </SuspendForUnresolvedDependencies>
        )
      },
      (use) => use(envSource),
    )

    const Test = () => <>{useMountSource(rootSource).content}</>
    const { container } = render(
      <StrictMode>
        <Suspense fallback={'loading'}>
          <Test />
        </Suspense>
      </StrictMode>,
    )

    expect(container).toHaveTextContent('loading')
    await act(() => deferred.resolve(1))
    expect(container).toHaveTextContent('/complete')
  })

  test(`can change to a suspended updating env without seeing a loading content`, async () => {
    const rootSource1 = mount(() => '/start', getEmptyEnv)

    const [envSource, setEnv] = createState({ pathname: '/redirect' })
    const deferred = new Deferred()
    const rootSource2 = mount(
      (env: LoaderProps<{ pathname: string }>) => {
        if (env.pathname === '/redirect') {
          env.mount.dependencies.add(deferred.promise)
        }
        return (
          <SuspendForUnresolvedDependencies
            dependencies={env.mount.dependencies}>
            {env.pathname}
          </SuspendForUnresolvedDependencies>
        )
      },
      (use) => use(envSource),
    )

    let setState!: any
    const Test = () => {
      const [source, _setState] = useState(rootSource1)
      setState = _setState
      const root = useMountSource(source)
      return (
        <>
          {root.content}
          {root.pendingEnv ? ' suspended' : ''}
        </>
      )
    }
    const { container } = render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
    expect(container).toHaveTextContent('/start')
    await act(async () => {
      setState(rootSource2)
    })
    expect(container).toHaveTextContent('/start suspended')
    await act(async () => {
      setEnv({ pathname: '/complete' })
      deferred.resolve(true)
    })
    expect(container).toHaveTextContent('/complete')
  })

  test(`changing root sources immediately updates content`, () => {
    const rootSource1 = mount(() => 'start', getEmptyEnv)
    const rootSource2 = mount(() => 'complete', getEmptyEnv)

    let setState!: any
    const Test = () => {
      const [source, _setState] = useState(rootSource1)
      setState = _setState
      return <>{useMountSource(source).content}</>
    }

    const { container } = render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
    expect(container).toHaveTextContent('start')
    act(() => {
      setState(rootSource2)
    })
    expect(container).toHaveTextContent('complete')
  })

  test(`when changing to a pending source, keep old content until new source has a value`, async () => {
    const [pendingSource, setPendingSource] = createState<object>()

    const rootSource1 = mount(() => 'start', getEmptyEnv)
    const rootSource2 = mount(
      () => 'complete',
      (use) => use(pendingSource),
    )
    let setState!: any
    const Test = () => {
      const [source, _setState] = useState(rootSource1)
      setState = _setState
      const root = useMountSource(source)
      return (
        <>
          {root.content}
          {root.pending ? ' pending' : ''}
        </>
      )
    }
    const { container } = render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
    expect(container).toHaveTextContent('start')
    await act(async () => {
      await setState(rootSource2)
    })
    expect(container).toHaveTextContent('start pending')
    await act(async () => {
      setPendingSource({ done: true })
    })
    await waitFor(() => {
      expect(container).toHaveTextContent('complete')
    })
  })

  test(`can externally wait for suspension list to resolve to avoid initial suspense`, async () => {
    const rootSource = mount((env) => {
      env.mount.dependencies.add(delay(10))
      return (
        <SuspendForUnresolvedDependencies dependencies={env.mount.dependencies}>
          test
        </SuspendForUnresolvedDependencies>
      )
    }, getEmptyEnv)

    await getSnapshot(rootSource).dependencies.resolve()

    const Test = () => <>{useMountSource(rootSource).content}</>

    const { container } = render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
    expect(container).toHaveTextContent('test')
    await act(async () => {})
    expect(container).toHaveTextContent('test')
  })

  test(`doesn't resolve waitUntilStable() calls until the new content has mounted`, async () => {
    const [envSource, setEnv] = createState({ pathname: '/start' })
    const deferred = new Deferred()
    const rootSource = mount(
      (env: LoaderProps<{ pathname: string }>) => {
        if (env.pathname === '/lazy') {
          env.mount.dependencies.add(deferred.promise)
        }
        return (
          <SuspendForUnresolvedDependencies
            dependencies={env.mount.dependencies}>
            {env.pathname}
          </SuspendForUnresolvedDependencies>
        )
      },
      (use) => use(envSource),
    )

    let root!: UseMountState<any>

    const Test = () => {
      root = useMountSource(rootSource)
      return (
        <>
          <Suspense fallback="loading">{root.content}</Suspense>
          {root.pendingEnv ? ' suspended' : ''}
        </>
      )
    }

    const { container } = render(<Test />)
    let stablePromise!: Promise<void>
    expect(container).toHaveTextContent('/start')
    act(() => {
      setEnv({ pathname: '/lazy' })
      stablePromise = root.waitUntilStable()
    })
    expect(container).toHaveTextContent('/start suspended')
    await act(async () => {
      deferred.resolve(true)
      expect(container).toHaveTextContent('/start suspended')
    })
    await act(() => stablePromise)
    expect(container).toHaveTextContent('/lazy')
  })

  test(`waitUntilStable() waits until any subsequent envs have loaded before resolving`, async () => {
    const [envSource, setEnv] = createState({ pathname: '/start' })
    const deferred = new Deferred()
    const rootSource = mount(
      (env: LoaderProps<{ pathname: string }>) => {
        if (env.pathname === '/lazy') {
          env.mount.dependencies.add(deferred.promise)
        }
        return (
          <SuspendForUnresolvedDependencies
            dependencies={env.mount.dependencies}>
            {env.pathname}
          </SuspendForUnresolvedDependencies>
        )
      },
      (use) => use(envSource),
    )

    let root!: UseMountState<any>

    const Test = () => {
      root = useMountSource(rootSource)
      return (
        <>
          <Suspense fallback="loading">{root.content}</Suspense>
          {root.pendingEnv ? ' suspended' : ''}
        </>
      )
    }

    const { container } = render(<Test />)
    let stablePromise!: Promise<void>
    expect(container).toHaveTextContent('/start')
    act(() => {
      setEnv({ pathname: '/lazy' })
      stablePromise = root.waitUntilStable()
    })
    expect(container).toHaveTextContent('/start suspended')
    await act(async () => {
      deferred.resolve(true)
      expect(container).toHaveTextContent('/start suspended')
    })
    await act(async () => {
      setEnv({ pathname: '/complete' })
      await stablePromise
    })
    expect(container).toHaveTextContent('/complete')
  })

  test(`renders anyway after transitionTimeoutMs when changing to an env with pending dependiencies`, async () => {
    jest.useFakeTimers()

    const [envSource, setEnv] = createState({ pathname: '/start' })
    const rootSource = mount(
      (env: LoaderProps<{ pathname: string }>) => {
        if (env.pathname === '/pending') {
          env.mount.dependencies.add(pendingPromiseLike)
        }
        return (
          <SuspendForUnresolvedDependencies
            dependencies={env.mount.dependencies}>
            {env.pathname}
          </SuspendForUnresolvedDependencies>
        )
      },
      (use) => use(envSource),
    )

    let root!: UseMountState<any>

    const Test = () => {
      root = useMountSource(rootSource, {
        transitionTimeoutMs: 1000,
      })
      return (
        <>
          <Suspense fallback="fallback">{root.content}</Suspense>
          {root.pendingEnv ? ' suspended' : ''}
        </>
      )
    }

    const { container } = render(<Test />)
    expect(container).toHaveTextContent('/start')
    act(() => {
      setEnv({ pathname: '/pending' })
    })
    expect(container).toHaveTextContent('/start suspended')
    await act(async () => {
      jest.runAllTimers()
      expect(container).toHaveTextContent('/start suspended')
    })
    expect(container).toHaveTextContent('fallback')
  })

  test(`suspends after transitionTimeoutMs when changing to a pending mount`, async () => {
    jest.useFakeTimers()

    const [envSource] = createState({ pathname: '/start' })
    const [pendingEnvSource] = createState<{ pathname: string }>()
    const loader = (env: LoaderProps<{ pathname: string }>) => (
      <>{env.pathname}</>
    )
    const initialMountSource = mount(loader, (use) => use(envSource))
    const pendingMountSource = mount(loader, pendingEnvSource)

    let root!: UseMountState<any>
    let mountSource = initialMountSource
    let setMountSource: any

    const Test = () => {
      ;[mountSource, setMountSource] = useState(initialMountSource)
      root = useMountSource(mountSource, {
        transitionTimeoutMs: 1000,
      })
      return (
        <>
          {root.content}
          {root.pending ? ' suspended' : ''}
        </>
      )
    }

    const { container } = render(
      <Suspense fallback="fallback">
        <Test />
      </Suspense>,
    )
    expect(container).toHaveTextContent('/start')
    await act(async () => {
      setMountSource(pendingMountSource)
    })
    expect(container).toHaveTextContent('/start suspended')
    await act(async () => {
      jest.runAllTimers()
      expect(container).toHaveTextContent('/start suspended')
    })
    expect(container).toHaveTextContent('fallback')
  })

  test(`suspends after transitionTimeoutMs when the env loses its value`, async () => {
    jest.useFakeTimers()

    const [envSource, setEnvSource] = createStateVector([
      { pathname: '/start' },
    ])
    const mountSource = mount(
      (env: LoaderProps<{ pathname: string }>) => <>{env.pathname}</>,
      (use) => use(envSource),
    )

    let root!: UseMountState<any>

    const Test = () => {
      root = useMountSource(mountSource, {
        transitionTimeoutMs: 1000,
      })
      return (
        <>
          {root.content}
          {root.pending ? ' suspended' : ''}
        </>
      )
    }

    const { container } = render(
      <Suspense fallback="fallback">
        <Test />
      </Suspense>,
    )
    expect(container).toHaveTextContent('/start')
    await act(async () => {
      setEnvSource([])
    })
    expect(container).toHaveTextContent('/start suspended')
    await act(async () => {
      jest.runAllTimers()
      expect(container).toHaveTextContent('/start suspended')
    })
    expect(container).toHaveTextContent('fallback')
  })
})
