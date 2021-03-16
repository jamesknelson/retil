import { cloneElement, useCallback, useMemo } from 'react'
import { memoizeOne } from 'retil-support'

import { joinRefs } from './joinRefs'

// Returns a function that adds the specified ref to the argument element,
// memoizing the created function to avoid frequent changes to the resulting
// callback ref.
export function useConnectRef(
  ref: React.RefCallback<any> | React.MutableRefObject<any> | null | undefined,
): (element: React.ReactElement) => React.ReactElement {
  const memoizedJoinTriggerRef = useMemo(() => memoizeOne(joinRefs), [])
  return useCallback(
    (element: React.ReactElement) =>
      cloneElement(element, {
        ref: memoizedJoinTriggerRef(ref, element.props.ref),
      }),
    [memoizedJoinTriggerRef, ref],
  )
}
