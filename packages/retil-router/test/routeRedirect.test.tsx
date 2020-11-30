import { createRequest, getInitialSnapshot, routeRedirect } from '../src'

describe('routeByRedirect', () => {
  test(`supports relative redirects`, async () => {
    const router = routeRedirect('./acquisition')
    const route = await getInitialSnapshot(
      router,
      createRequest('/browse/deck', {
        basename: '/browse/deck',
      }),
    )
    expect(route.response.headers.Location).toBe('/browse/deck/acquisition')
  })

  test(`supports absolute redirects`, async () => {
    const router = routeRedirect('/test')
    const route = await getInitialSnapshot(
      router,
      createRequest('/browse/deck', {
        basename: '/browse/deck',
      }),
    )
    expect(route.response.headers.Location).toBe('/test')
  })
})
