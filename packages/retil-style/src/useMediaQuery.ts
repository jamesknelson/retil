import { useFirstMatchingMediaIndex } from './useFirstMatchingMediaQuery'

export function useMediaQuery(query: string): boolean | undefined {
  const index = useFirstMatchingMediaIndex([query])
  return index === undefined ? undefined : index === 0
}
