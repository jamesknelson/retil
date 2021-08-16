import { useSilencedLayoutEffect } from 'retil-support'

let activeDisableScrollingCount = 0

export function useUnscrollableBody(active = true, returnTo = 'auto') {
  useSilencedLayoutEffect(() => {
    if (active) {
      activeDisableScrollingCount += 1
      if (activeDisableScrollingCount === 1) {
        document.body.style.overflow = 'hidden'
      }
      return () => {
        activeDisableScrollingCount -= 1
        if (activeDisableScrollingCount === 0) {
          document.body.style.overflow = returnTo
        }
      }
    }
  }, [active])
}
