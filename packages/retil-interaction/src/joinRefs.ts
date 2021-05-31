import { useMemo } from 'react'
import { joinRefs, memoizeOne } from 'retil-support'

export function useJoinRefs() {
  return useMemo(() => memoizeOne(joinRefs), [])
}
