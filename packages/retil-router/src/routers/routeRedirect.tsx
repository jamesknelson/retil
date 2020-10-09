import * as React from 'react'
import { resolveAction, createHref, parseAction } from 'retil-history'

import { useRouterController } from '../hooks/useRouterController'
import { RouterAction, RouterFunction, RouterRequest } from '../routerTypes'

export interface RedirectProps {
  href: string
}

export const Redirect: React.FunctionComponent<RedirectProps> = (props) => {
  const controller = useRouterController()
  // Navigate in a microtask so that we don't cause any synchronous updates to
  // components listening to the history.
  throw Promise.resolve().then(() =>
    controller.navigate(props.href, { replace: true }),
  )
}

export function routeRedirect<Request extends RouterRequest = RouterRequest>(
  to: RouterAction<any> | ((request: Request) => RouterAction<any>),
  status = 302,
): RouterFunction<Request> {
  return (fromRequest, response) => {
    const toAction = parseAction(
      typeof to === 'function' ? to(fromRequest) : to,
    )
    const href = createHref(resolveAction(toAction, fromRequest.basename))

    response.headers.Location = href
    response.status = status

    return <Redirect href={href} />
  }
}
