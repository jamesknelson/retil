import { mount } from 'retil-mount'
import { getSnapshot } from 'retil-source'

import { StaticNavContext, getStaticNavEnv, redirect } from '../src'

describe('routeByRedirect', () => {
  test(`supports relative redirects`, async () => {
    const context = {} as StaticNavContext
    const loader = redirect('./acquisition')
    const env = {
      ...getStaticNavEnv('/browse/deck', context),
      basename: '/browse/deck',
    }

    await getSnapshot(mount(loader, env)).dependencies.resolve()

    expect(context.headers.Location).toBe('/browse/deck/acquisition')
  })

  test(`supports absolute redirects`, async () => {
    const context = {} as StaticNavContext
    const loader = redirect('/test')
    const env = {
      ...getStaticNavEnv('/browse/deck', context),
      basename: '/browse/deck',
    }

    await getSnapshot(mount(loader, env)).dependencies.resolve()

    expect(context.headers.Location).toBe('/test')
  })
})
