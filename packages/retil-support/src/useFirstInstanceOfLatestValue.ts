import deepEqual from 'fast-deep-equal'
import { useEffect, useRef } from 'react'

export function useFirstInstanceOfLatestValue<T>(
  instance: T,
  isEqual: (x: T, y: T) => boolean = deepEqual,
): T {
  const ref = useRef(instance)
  const firstInstance = isEqual(ref.current, instance) ? ref.current : instance
  useEffect(() => {
    ref.current = firstInstance
  }, [firstInstance])
  return firstInstance
}
