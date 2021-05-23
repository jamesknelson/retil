import '@testing-library/jest-dom/extend-expect'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { MountEnv, ServerMount, lazy, useMount } from 'retil-mount'
import { Deferred } from 'retil-support'

import { NavEnv, getStaticNavEnv, match, notFoundBoundary } from '../src'

describe('notFoundBoundary', () => {
  test(`works during SSR with async routes`, async () => {
    const deferred = new Deferred()
    const innerLoader = match({
      '/found': (request) => 'found' + request.pathname,
    })
    const loader = notFoundBoundary(
      lazy(async (req: NavEnv & MountEnv) => {
        await deferred.promise
        return innerLoader(req)
      }),
      (request) => 'not-found' + request.pathname,
    )
    const env = getStaticNavEnv('/test-1')
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
