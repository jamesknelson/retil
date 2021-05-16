import { useMemo } from 'react'

import { useNavEnv } from '../navContext'
import { NavAction, NavLocation } from '../navTypes'
import { parseAction, resolveAction } from '../navUtils'

export const useNavResolve = (
  action: NavAction,
  state?: object,
): NavLocation => {
  const { pathname } = useNavEnv()
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
