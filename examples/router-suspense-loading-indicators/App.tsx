import * as React from 'react'

import { delay } from '../../packages/retil-support/src'
import {
  Link,
  Router,
  RouterContent,
  routeAsync,
  routeByPattern,
  useRouterPending,
} from '../../packages/retil-router/src'

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

export function App() {
  return (
    <Router fn={appRouter} transitionTimeoutMs={500}>
      <nav>
        <Link to="/">Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/about">About</Link>
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
