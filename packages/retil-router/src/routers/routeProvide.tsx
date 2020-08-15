import * as React from 'react'

import { RouterRequestContext } from '../routerContext'
import { RouterFunction, RouterRequest, RouterResponse } from '../routerTypes'

export function routeProvide<
  Request extends RouterRequest,
  Response extends RouterResponse
>(
  router: RouterFunction<Request, Response>,
): RouterFunction<Request, Response> {
  return (request, response) => {
    const content = router(request, response)

    return <RouterContentWrapper content={content} request={request} />
  }
}

interface RouterContentWrapperProps {
  content: React.ReactNode
  request: RouterRequest
}

function RouterContentWrapper({ content, request }: RouterContentWrapperProps) {
  return (
    <RouterRequestContext.Provider value={request}>
      {content}
    </RouterRequestContext.Provider>
  )
}
