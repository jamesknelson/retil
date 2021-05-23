import '@testing-library/jest-dom/extend-expect'
import React, { StrictMode } from 'react'
import { render } from '@testing-library/react'
import { Deferred } from 'retil-support'

import { ServerMount, lazy, useMount } from '../src'

describe('ServerMount', () => {
  test('returns a mount snapshot from preload()', async () => {
    const loader = (env: any) => env.pathname
    const mount = new ServerMount(loader, { pathname: '/test' })
    const { content } = await mount.preload()
    expect(content).toBe('/test')
  })

  test('works with async routes', async () => {
    const deferred = new Deferred()

    const loader = lazy(async (env: any) => {
      env.asyncRef.current = await deferred.promise
      return 'done'
    })

    const env = { asyncRef: { current: undefined } }
    const mount = new ServerMount(loader, env)
    const mountSnapshotPromise = mount.preload()
    expect(env.asyncRef.current).toBe(undefined)
    deferred.resolve('/async')
    await mountSnapshotPromise
    expect(env.asyncRef.current).toBe('/async')
  })

  test('makes preloaded async content synchronously available using provide()', async () => {
    let loadCount = 0

    const deferred = new Deferred()
    const loader = lazy(async (env: any) => {
      loadCount++
      return env.pathname + (await deferred.promise)
    })

    const env = { pathname: '/success' }
    const mount = new ServerMount(loader, env)

    const preloadPromise = mount.preload()

    deferred.resolve('/async')

    await preloadPromise

    const Test = () => <>{useMount(loader, env).content}</>
    const { container } = render(
      mount.provide(
        <StrictMode>
          <Test />
        </StrictMode>,
      ),
    )

    expect(loadCount).toBe(1)
    expect(container).toHaveTextContent('/success/async')
  })
})
