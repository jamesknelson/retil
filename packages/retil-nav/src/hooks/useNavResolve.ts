import { useMemo } from 'react'
import { memoizeOne } from 'retil-support'

import { useNavSnapshot } from '../navContext'
import { NavAction, NavLocation } from '../navTypes'
import { areActionsEqual, parseAction, resolveAction } from '../navUtils'

export const useNavResolve = (): ((
  action: NavAction,
  state?: object,
) => NavLocation) => {
  const { basename, pathname } = useNavSnapshot()
  return useMemo(
    () =>
      memoizeOne(
        (action: NavAction, state?: object) =>
          resolveAction(parseAction(action, state), pathname, basename),
        ([xa, xs], [ya, ys]) => xs === ys && areActionsEqual(xa, ya),
      ),
    [basename, pathname],
  )
}
