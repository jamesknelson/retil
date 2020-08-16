import { RouterFunction, getInitialStateAndResponse, routeAsync } from '../src'

describe('getInitialStateAndResponse()', () => {
  test('works', async () => {
    const router: RouterFunction = (request) => request.pathname
    const [route] = await getInitialStateAndResponse(router, '/test')

    expect(route.content).toBe('/test')
  })

  test('works with async routes', async () => {
    const router = routeAsync(async (request, response) => {
      response.headers['async-test'] = 'async-test'
      return 'done'
    })

    const [, response] = await getInitialStateAndResponse(router, '/test')

    expect(response.headers['async-test']).toBe('async-test')
  })
})
