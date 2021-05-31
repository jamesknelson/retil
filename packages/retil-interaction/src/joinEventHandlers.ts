import { useMemo } from 'react'
import { joinEventHandlers, memoizeOne } from 'retil-support'

export function useJoinEventHandlers() {
  return useMemo(() => memoizeOne(joinEventHandlers), [])
}
