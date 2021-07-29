import { useEffect, useMemo, useRef, useState } from 'react'
import { useIsHydrating } from 'retil-hydration'
import { useCSSSelectors } from 'retil-css'
import { areArraysShallowEqual, identity, memoizeOne } from 'retil-support'

import { MediaSelector } from './mediaSelector'

/**
 * When rendering server side or performing the initial hydration, this will
 * return `undefined`, and it'll be up to the application to decide what to
 * display.
 *
 * @returns number | undefined
 */
export function useFirstMatchingMediaSelector(
  mediaSelectors: MediaSelector[],
): number | undefined {
  const isHydrating = useIsHydrating()
  const hasValue =
    !isHydrating &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia !== 'undefined'

  const unmemoizedMediaQueries = useCSSSelectors(mediaSelectors).map(
    (query) => {
      const nonArrayQuery = (Array.isArray(query) ? query.join(',') : query) as
        | string
        | boolean
      return typeof nonArrayQuery === 'string'
        ? nonArrayQuery.replace('@media', '').trim()
        : nonArrayQuery
    },
  )

  const memoArray = useMemo<
    (array: (string | boolean)[]) => (string | boolean)[]
  >(() => memoizeOne(identity, (x, y) => areArraysShallowEqual(x[0], y[0])), [])
  const mediaQueries = memoArray(unmemoizedMediaQueries)

  const matchesRef = useRef<undefined | boolean[]>()
  if (hasValue && !matchesRef.current) {
    matchesRef.current = mediaQueries.map((mediaQuery) =>
      typeof mediaQuery === 'string'
        ? window.matchMedia(mediaQuery).matches
        : mediaQuery,
    )
  }
  const [firstMatchIndex, setFirstMatchIndex] = useState<number | undefined>(
    () => matchesRef.current?.findIndex(Boolean),
  )

  useEffect(() => {
    if (hasValue) {
      const results = mediaQueries.map((query) =>
        typeof query === 'string' ? window.matchMedia(query) : query,
      )
      const matches = (matchesRef.current = results.map((result) =>
        typeof result === 'boolean' ? result : result.matches,
      ))

      setFirstMatchIndex(matches.findIndex(Boolean))

      const unsubscribe = [] as [
        queryList: MediaQueryList,
        handler: () => void,
      ][]
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        if (typeof result !== 'boolean') {
          const index = i
          const handler = () => {
            matches[index] = result.matches
            setFirstMatchIndex(matches.findIndex(Boolean))
          }
          result.addListener(handler)
          unsubscribe.push([result, handler])
        }
      }

      return () => {
        unsubscribe.forEach(([queryList, handler]) =>
          queryList.removeListener(handler),
        )
      }
    }
  }, [hasValue, mediaQueries])

  return firstMatchIndex
}
