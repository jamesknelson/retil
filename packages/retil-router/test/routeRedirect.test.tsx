import { getInitialStateAndResponse, routeRedirect } from '../src'

describe('routeByRedirect', () => {
  test(`supports relative redirects`, async () => {
    const router = routeRedirect('./acquisition')
    const [, response] = await getInitialStateAndResponse(
      router,
      '/browse/deck',
      {
        basename: '/browse/deck',
      },
    )
    expect(response.headers.Location).toBe('/browse/deck/acquisition')
  })

  test(`supports absolute redirects`, async () => {
    const router = routeRedirect('/test')
    const [, response] = await getInitialStateAndResponse(
      router,
      '/browse/deck',
      {
        basename: '/browse/deck',
      },
    )
    expect(response.headers.Location).toBe('/test')
  })
})
