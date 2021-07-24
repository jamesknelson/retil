import { MediaSelector } from './mediaSelector'
import { useFirstMatchingMediaSelector } from './useFirstMatchingMediaSelector'

export function useMediaSelector(query: MediaSelector): boolean | undefined {
  const index = useFirstMatchingMediaSelector([query])
  return index === undefined ? undefined : index === 0
}
