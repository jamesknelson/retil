import { mountOnce } from 'retil-mount'

import {
  createStaticNavEnv,
  createStaticNavResponse,
  loadRedirect,
} from '../src'

describe('loadRedirect()', () => {
  test(`supports relative redirects`, async () => {
    const loader = loadRedirect('./acquisition')
    const response = createStaticNavResponse()
    const env = createStaticNavEnv({
      url: '/browse/deck',
      response,
      basename: '/browse/deck',
    })

    await mountOnce(loader, env)

    expect(response.getHeaders().Location).toBe('/browse/deck/acquisition')
  })

  test(`supports absolute redirects`, async () => {
    const loader = loadRedirect('/test')
    const response = createStaticNavResponse()
    const env = createStaticNavEnv({
      url: '/browse/deck',
      response,
      basename: '/browse/deck',
    })

    await mountOnce(loader, env)

    expect(response.getHeaders().Location).toBe('/test')
  })
})
