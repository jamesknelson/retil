import { useMemo } from 'react'
import { joinEventHandlers, memoizeOne } from 'retil-support'

export function useJoinEventHandlers() {
  return useMemo(() => memoizeOne(joinEventHandlers), [])
}

export const useJoinedEventHandler: typeof joinEventHandlers = (
  x: any,
  y: any,
) => useMemo(() => joinEventHandlers(x, y), [x, y])
