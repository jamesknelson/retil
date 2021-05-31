import { useEffect, useState } from 'react'
import { useHasHydrated } from 'retil-hydration'

export function useMediaQuery(queryInput: string): boolean | null {
  const hasHydrated = useHasHydrated()
  const query = queryInput.replace('@media ', '')
  const supportMatchMedia =
    typeof window !== 'undefined' && typeof window.matchMedia !== 'undefined'

  const [matches, setMatches] = useState<boolean | null>(() => {
    if (hasHydrated && supportMatchMedia) {
      return window.matchMedia(query).matches
    }

    // Once the component is mounted, we rely on the
    // event listeners to return the correct matches value.
    return null
  })

  useEffect(() => {
    if (!supportMatchMedia) {
      return undefined
    }

    const queryList = window.matchMedia(query)
    setMatches(queryList.matches)

    const handleMatchesChange = () => {
      setMatches(queryList.matches)
    }

    queryList.addListener(handleMatchesChange)
    return () => {
      queryList.removeListener(handleMatchesChange)
    }
  }, [query, supportMatchMedia])

  return matches
}
