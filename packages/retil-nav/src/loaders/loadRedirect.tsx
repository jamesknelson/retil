import React, { ReactNode } from 'react'
import { Loader, LoaderProps } from 'retil-mount'

import { NavAction, NavEnv } from '../navTypes'
import { resolveAction, createHref, parseAction } from '../navUtils'

export interface RedirectProps {
  redirectPromise: PromiseLike<any>
}

export const Redirect: React.FunctionComponent<RedirectProps> = (props) => {
  throw Promise.resolve(props.redirectPromise)
}

/**
 * Redirect this env using the specified nav action.
 */
export function redirect(
  env: LoaderProps<NavEnv>,
  to: NavAction | ((env: NavEnv) => NavAction),
  status = 302,
): null {
  const toAction = parseAction(typeof to === 'function' ? to(env) : to)
  const href = createHref(resolveAction(toAction, env.nav.basename))

  // Defer this promise until we're ready to actually render the content that
  // would have existed at this page, as we don't want to follow redirects
  // within precache loaders.
  const lazyPromise: PromiseLike<void> = {
    then: (...args) => {
      env.nav.redirect(status, href)
      return Promise.resolve().then(...args)
    },
  }

  env.mount.dependencies.add(lazyPromise)

  return null
}

export function loadRedirect<TEnv extends NavEnv>(
  to: NavAction | ((env: NavEnv) => NavAction),
  status = 302,
): Loader<TEnv, ReactNode> {
  return (env) => redirect(env, to, status)
}
