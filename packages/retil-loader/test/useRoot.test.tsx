import '@testing-library/jest-dom/extend-expect'
import React, { StrictMode, Suspense, useState } from 'react'
import { createState } from 'retil-source'
import { Deferred, delay } from 'retil-support'
import { act, render, waitFor } from '@testing-library/react'

import {
  DependencyList,
  LoadEnv,
  Mount,
  load,
  loadOnce,
  useMount,
} from '../src'

const getEmptyEnv = () => ({})

export const SuspendForUnresolvedDependencies = ({
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

describe('useRoot', () => {
  test(`returns content`, () => {
    const rootSource = load(() => 'success', getEmptyEnv)
    const Test = () => <>{useMount(rootSource).content}</>
    const { container } = render(
      <StrictMode>
        <Test />
      </StrictMode>,
    )
    expect(container).toHaveTextContent('success')
  })

  test(`only runs the loader once`, () => {
    let runCount = 0
    const rootSource = load(() => {
      runCount++
      return 'test'
    }, getEmptyEnv)
    const Test = () => <>{useMount(rootSource).content}</>
    render(<Test />)
    expect(runCount).toBe(1)
  })

  test(`lazily executes suspending sources just once, even in strict mode`, async () => {
    let runCount = 0
    let deferred: Deferred = new Deferred()
    const rootSource = load((env) => {
      runCount++
      env.dependencies.add(deferred.promise)
      return (
        <SuspendForUnresolvedDependencies dependencies={env.dependencies}>
          test
        </SuspendForUnresolvedDependencies>
      )
    }, getEmptyEnv)
    const Test = () => <>{useMount(rootSource).content}</>
    const { container } = render(
      <StrictMode>
        <Suspense fallback={'loading'}>
          <Test />
        </Suspense>
      </StrictMode>,
    )
    expect(container).toHaveTextContent('loading')
    deferred.resolve(true)
    await waitFor(() => {
      expect(runCount).toBe(1)
      expect(container).toHaveTextContent('test')
    })
  })

  test(`can suspend to update env at startup`, async () => {
    const [envSource, setEnv] = createState({ pathname: '/start' })
    const redirect = async (pathname: string) => {
      await delay(1)
      setEnv({ pathname })
    }

    const rootSource = load(
      (env: LoadEnv & { pathname: string }) => {
        if (env.pathname === '/start') {
          env.dependencies.add(redirect('/complete'))
        }
        return (
          <SuspendForUnresolvedDependencies dependencies={env.dependencies}>
            {env.pathname}
          </SuspendForUnresolvedDependencies>
        )
      },
      (use) => use(envSource),
    )

    const Test = () => <>{useMount(rootSource).content}</>
    const { container } = render(
      <StrictMode>
        <Suspense fallback={'loading'}>
          <Test />
        </Suspense>
      </StrictMode>,
    )

    expect(container).toHaveTextContent('loading')
    await waitFor(() => {
      expect(container).toHaveTextContent('/complete')
    })
  })

  test(`can change to a suspended updating env without seeing a loading content`, async () => {
    const rootSource1 = load(() => '/start', getEmptyEnv)

    const [envSource, setEnv] = createState({ pathname: '/redirect' })
    const deferred = new Deferred()
    const rootSource2 = load(
      (env: LoadEnv & { pathname: string }) => {
        if (env.pathname === '/redirect') {
          env.dependencies.add(deferred.promise)
        }
        return (
          <SuspendForUnresolvedDependencies dependencies={env.dependencies}>
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
      const root = useMount(source)
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
    const rootSource1 = load(() => 'start', getEmptyEnv)
    const rootSource2 = load(() => 'complete', getEmptyEnv)

    let setState!: any
    const Test = () => {
      const [source, _setState] = useState(rootSource1)
      setState = _setState
      return <>{useMount(source).content}</>
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

    const rootSource1 = load(() => 'start', getEmptyEnv)
    const rootSource2 = load(
      () => 'complete',
      (use) => use(pendingSource),
    )
    let setState!: any
    const Test = () => {
      const [source, _setState] = useState(rootSource1)
      setState = _setState
      const root = useMount(source)
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
    const rootSource = await loadOnce((env) => {
      env.dependencies.add(delay(10))
      return (
        <SuspendForUnresolvedDependencies dependencies={env.dependencies}>
          test
        </SuspendForUnresolvedDependencies>
      )
    }, getEmptyEnv)

    const Test = () => <>{useMount(rootSource).content}</>

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
    const rootSource = load(
      (env: LoadEnv & { pathname: string }) => {
        if (env.pathname === '/lazy') {
          env.dependencies.add(deferred.promise)
        }
        return (
          <SuspendForUnresolvedDependencies dependencies={env.dependencies}>
            {env.pathname}
          </SuspendForUnresolvedDependencies>
        )
      },
      (use) => use(envSource),
    )

    let root!: Mount<any>

    const Test = () => {
      root = useMount(rootSource)
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
      await stablePromise
      expect(container).toHaveTextContent('/lazy')
    })
  })

  test(`waitUntilStable() waits until any subsequent envs have loaded before resolving`, async () => {
    const [envSource, setEnv] = createState({ pathname: '/start' })
    const deferred = new Deferred()
    const rootSource = load(
      (env: LoadEnv & { pathname: string }) => {
        if (env.pathname === '/lazy') {
          env.dependencies.add(deferred.promise)
        }
        return (
          <SuspendForUnresolvedDependencies dependencies={env.dependencies}>
            {env.pathname}
          </SuspendForUnresolvedDependencies>
        )
      },
      (use) => use(envSource),
    )

    let root!: Mount<any>

    const Test = () => {
      root = useMount(rootSource)
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
      setEnv({ pathname: '/complete' })
      await stablePromise
      expect(container).toHaveTextContent('/complete')
    })
  })
})
