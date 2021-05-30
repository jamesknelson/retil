import React, { ReactElement } from 'react'
import { Loader } from 'retil-mount'

import { NavAction, NavEnv } from '../navTypes'
import { resolveAction, createHref, parseAction } from '../navUtils'

export interface RedirectProps {
  redirectPromise: PromiseLike<any>
}

export const Redirect: React.FunctionComponent<RedirectProps> = (props) => {
  throw Promise.resolve(props.redirectPromise)
}

export function loadRedirect<TEnv extends NavEnv>(
  to: NavAction | ((env: NavEnv) => NavAction),
  status = 302,
): Loader<TEnv, ReactElement> {
  return (env) => {
    const toAction = parseAction(typeof to === 'function' ? to(env) : to)
    const href = createHref(resolveAction(toAction, env.nav.basename))

    // Defer this promise until we're ready to actually render the content
    // that would have existed at this page.
    let redirectPromise: Promise<any> | undefined
    const lazyPromise: PromiseLike<void> = {
      then: (...args) => {
        redirectPromise = redirectPromise || env.nav.redirect(status, href)
        return redirectPromise.then(...args)
      },
    }

    env.mount.dependencies.add(lazyPromise)

    return <Redirect redirectPromise={lazyPromise} />
  }
}
