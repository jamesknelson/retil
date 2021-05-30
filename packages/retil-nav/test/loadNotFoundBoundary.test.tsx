import '@testing-library/jest-dom/extend-expect'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { ServerMount, loadAsync, useMount } from 'retil-mount'
import { Deferred } from 'retil-support'

import { createStaticNavEnv, loadMatch, loadNotFoundBoundary } from '../src'

describe('loadNotFoundBoundary()', () => {
  test(`works during SSR with async routes`, async () => {
    const deferred = new Deferred()
    const innerLoader = loadMatch({
      '/found': ({ nav }) => 'found' + nav.pathname,
    })
    const loader = loadNotFoundBoundary(
      loadAsync(async (env) => {
        await deferred.promise
        return innerLoader(env)
      }),
      (env) => 'not-found' + env.nav.pathname,
    )
    const env = createStaticNavEnv({ url: '/test-1' })
    const mount = new ServerMount(loader, env)

    const mountPromise = mount.preload()

    deferred.resolve('test')

    await mountPromise

    const Test = () => {
      const route = useMount(loader, env)
      return <>{route.content}</>
    }

    const html = renderToString(mount.provide(<Test />))

    expect(html).toEqual('not-found/test-1')
  })
})
