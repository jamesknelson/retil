import { useMemo } from 'react'
import { parseAction, resolveAction } from 'retil-history'

import { RouterAction, RouterLocation } from '../routerTypes'

import { useRouterRequest } from './useRouterRequest'

export const useResolveRoute = (
  action: RouterAction,
  state?: object,
): RouterLocation => {
  const { pathname } = useRouterRequest()
  const resolved = useMemo(
    () => resolveAction(parseAction(action, state), pathname),
    [action, pathname, state],
  )

  // Memoize by action parts so that we'll output the same location object
  // until something actually changes.
  const deps = [
    resolved?.pathname,
    resolved?.search,
    resolved?.hash,
    resolved?.state,
  ]

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => resolved, deps)
}
