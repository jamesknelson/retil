import {
  RouterFunction,
  createRequest,
  getInitialSnapshot,
  routeAsync,
} from '../src'

describe('getInitialSnapshot()', () => {
  test('works', async () => {
    const router: RouterFunction = (request) => request.pathname
    const route = await getInitialSnapshot(router, createRequest('/test'))

    expect(route.content).toBe('/test')
  })

  test('works with async routes', async () => {
    const router = routeAsync(async (request, response) => {
      response.headers['async-test'] = 'async-test'
      return 'done'
    })

    const route = await getInitialSnapshot(router, createRequest('/test'))

    expect(route.response.headers['async-test']).toBe('async-test')
  })
})
