import { createBrowserNavService } from './browserNavService'
import { NavService } from './navTypes'

export const getDefaultBrowserNavService: {
  (window?: Window): NavService
  value?: NavService
  window?: Window
} = (window?): NavService => {
  if (
    !getDefaultBrowserNavService.value ||
    getDefaultBrowserNavService.window !== window
  ) {
    getDefaultBrowserNavService.value = createBrowserNavService({ window })
    getDefaultBrowserNavService.window = window
  }
  return getDefaultBrowserNavService.value
}
