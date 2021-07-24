import deepEqual from 'fast-deep-equal'
import memoizeOne from 'memoize-one'
import { useMemo } from 'react'

import { areShallowEqual } from './areShallowEqual'
import { identity } from './identity'

export function useMemoizeOneShallowValue(): <T>(x: T) => T {
  return useMemo(
    () => memoizeOne(identity, ([x], [y]) => areShallowEqual(x, y)),
    [],
  )
}

export function useMemoizeOneValue(): <T>(x: T) => T {
  return useMemo(() => memoizeOne(identity, deepEqual), [])
}
