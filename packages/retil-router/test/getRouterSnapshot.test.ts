import { RouterFunction, getRouterSnapshot, routeAsync } from '../src'

describe('getRoute()', () => {
  test('works', async () => {
    const router: RouterFunction = (request) => request.pathname
    const route = await getRouterSnapshot(router, '/test')

    expect(route.content).toBe('/test')
  })

  test('works with async routes', async () => {
    const router = routeAsync(async (request, response) => {
      response.headers['async-test'] = 'async-test'
      return 'done'
    })

    const route = await getRouterSnapshot(router, '/test')

    expect(route.response.headers['async-test']).toBe('async-test')
  })
})
