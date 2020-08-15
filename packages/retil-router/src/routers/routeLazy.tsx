import { RouterFunction, RouterRequest, RouterResponse } from '../routerTypes'

import { routeAsync } from './routeAsync'

export function routeLazy<
  Request extends RouterRequest,
  Response extends RouterResponse
>(
  load: () => PromiseLike<{ default: RouterFunction<Request, Response> }>,
): RouterFunction<Request, Response> {
  let router: RouterFunction<Request, Response> | undefined

  return routeAsync(async (request, response) => {
    if (!router) {
      router = (await load()).default
    }
    return router(request, response)
  })
}
