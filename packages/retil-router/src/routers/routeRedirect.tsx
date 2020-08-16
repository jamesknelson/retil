import * as React from 'react'
import { createHref, parseAction } from 'retil-history'

import { useRouterController } from '../hooks/useRouterController'
import { RouterAction, RouterFunction, RouterRequest } from '../routerTypes'

export interface RedirectProps {
  href: string
}

export const Redirect: React.SFC<RedirectProps> = (props) => {
  const controller = useRouterController()
  throw controller.navigate(props.href, { replace: true })
}

export function routeRedirect<Request extends RouterRequest = RouterRequest>(
  to: RouterAction<any> | ((request: Request) => RouterAction<any>),
  status = 302,
): RouterFunction<Request> {
  return (fromRequest, response) => {
    const toRequest = parseAction(
      typeof to === 'function' ? to(fromRequest) : to,
    )
    const href = createHref(toRequest)

    response.headers.Location = href
    response.status = status

    return <Redirect href={href} />
  }
}
