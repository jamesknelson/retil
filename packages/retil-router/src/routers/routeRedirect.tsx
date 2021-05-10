import * as React from 'react'
import { resolveAction, createHref, parseAction } from 'retil-history'

import {
  RouterAction,
  RouterFunction,
  RouterRouteSnapshot,
} from '../routerTypes'

export interface RedirectProps {
  redirectPromise: PromiseLike<any>
}

export const Redirect: React.FunctionComponent<RedirectProps> = (props) => {
  throw Promise.resolve(props.redirectPromise)
}

export function routeRedirect<
  Request extends RouterRouteSnapshot = RouterRouteSnapshot
>(
  to: RouterAction | ((request: Request) => RouterAction),
  status = 302,
): RouterFunction<Request> {
  return (fromRequest, response) => {
    const toAction = parseAction(
      typeof to === 'function' ? to(fromRequest) : to,
    )
    const href = createHref(resolveAction(toAction, fromRequest.basename))

    // Defer this promise until we're ready to actually render the content
    // that would have existed at this page.
    let redirectPromise: Promise<any> | undefined
    const lazyPromise: PromiseLike<void> = {
      then: (...args) => {
        redirectPromise = redirectPromise || response.redirect(status, href)
        return redirectPromise.then(...args)
      },
    }

    response.pendingSuspenses.push(lazyPromise)

    return <Redirect redirectPromise={lazyPromise} />
  }
}
