import { ReactNode } from 'react'
import { Loader } from 'retil-mount'

import { NavAction, NavEnv } from '../navTypes'
import { parseAction } from '../navUtils'

export function loadRedirect<TEnv extends NavEnv>(
  to: NavAction | ((env: NavEnv) => NavAction),
  status = 302,
): Loader<TEnv, ReactNode> {
  return (env) => {
    const toAction = parseAction(typeof to === 'function' ? to(env) : to)
    return env.nav.redirect(status, toAction)
  }
}
