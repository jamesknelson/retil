import React, { useMemo } from 'react'

import {
  Link,
  Router,
  RouterContent,
  createBrowserHistory,
  createRequestService,
  routeAsync,
  routeByPattern,
  useRouterPending,
} from 'retil-router'
import { delay } from 'retil-support'

const homeRouter = routeAsync(async () => {
  await delay(1000)
  return <h1>Welcome!</h1>
})

const aboutRouter = routeAsync(async () => {
  await delay(1000)
  return <h1>About</h1>
})

const appRouter = routeByPattern({
  '/': homeRouter,
  '/about': aboutRouter,
})

function App({ basename }: { basename: string }) {
  const requestService = useMemo(
    () =>
      createRequestService({
        basename,
        historyService: createBrowserHistory(),
      }),
    [basename],
  )

  return (
    <Router
      fn={appRouter}
      requestService={requestService}
      transitionTimeoutMs={500}>
      <nav>
        <Link to={basename}>Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to={basename + '/about'}>About</Link>
      </nav>
      <main>
        <React.Suspense fallback="loading fallback...">
          <RouterPendingIndicator />
          <RouterContent />
        </React.Suspense>
      </main>
    </Router>
  )
}

function RouterPendingIndicator() {
  const pending = useRouterPending()
  return <>{pending && 'loading concurrently...'}</>
}

export default App
