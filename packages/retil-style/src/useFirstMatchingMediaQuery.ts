import { useEffect, useMemo, useRef, useState } from 'react'
import { useIsHydrating } from 'retil-hydration'
import { areArraysShallowEqual, identity, memoizeOne } from 'retil-support'

/**
 * @returns number | undefined When rendering server side or performing the
 * initial hydration, this will return `undefined`, and it'll be up to the
 * application to decide what to display.
 */
export function useFirstMatchingMediaIndex(
  unmemoizedMediaQueries: string[],
): number | undefined {
  const isHydrating = useIsHydrating()
  const hasValue =
    !isHydrating &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia !== 'undefined'

  const memoArray = useMemo<(array: string[]) => string[]>(
    () => memoizeOne(identity, (x, y) => areArraysShallowEqual(x[0], y[0])),
    [],
  )
  const mediaQueries = memoArray(unmemoizedMediaQueries)

  const matchesRef = useRef<undefined | boolean[]>()
  if (hasValue && !matchesRef.current) {
    matchesRef.current = mediaQueries.map(
      (mediaQuery) => window.matchMedia(mediaQuery).matches,
    )
  }
  const [firstMatchIndex, setFirstMatchIndex] = useState<number | undefined>(
    () => matchesRef.current?.findIndex(Boolean),
  )

  useEffect(() => {
    if (!hasValue) {
      return
    }

    const queryLists = mediaQueries.map((query) => window.matchMedia(query))
    const matches = (matchesRef.current = queryLists.map(
      (queryList) => queryList.matches,
    ))

    setFirstMatchIndex(matches.findIndex(Boolean))

    const handlers = queryLists.map((queryList, i) => () => {
      matches[i] = queryList.matches
      setFirstMatchIndex(matches.findIndex(Boolean))
    })

    queryLists.forEach((queryList, i) => queryList.addListener(handlers[i]))

    return () => {
      queryLists.forEach((queryList, i) =>
        queryList.removeListener(handlers[i]),
      )
    }
  }, [hasValue, mediaQueries])

  return firstMatchIndex
}
