import { createBrowserHistory } from './historyServices'
import { HistoryService } from './history'

export const getDefaultBrowserHistory: {
  (window?: Window): HistoryService
  history?: HistoryService
  window?: Window
} = (window?): HistoryService => {
  if (
    !getDefaultBrowserHistory.history ||
    getDefaultBrowserHistory.window !== window
  ) {
    getDefaultBrowserHistory.history = createBrowserHistory({ window })
    getDefaultBrowserHistory.window = window
  }
  return getDefaultBrowserHistory.history
}
