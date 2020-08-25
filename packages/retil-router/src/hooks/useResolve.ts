import { useMemo } from 'react'
import { parseAction, resolveAction } from 'retil-history'

import {
  RouterAction,
  RouterHistoryState,
  RouterLocation,
} from '../routerTypes'

import { useRequest } from './useRequest'

export const useResolve = <S extends RouterHistoryState>(
  action: RouterAction<S>,
  state?: S,
): RouterLocation<S> => {
  const { pathname } = useRequest()
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
