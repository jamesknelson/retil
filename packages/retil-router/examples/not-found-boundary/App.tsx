import React, { useMemo } from 'react'

import {
  Link,
  Router,
  RouterContent,
  createBrowserHistory,
  createRequestService,
  routeByPattern,
  routeNotFoundBoundary,
} from 'retil-router'

const appRouter = routeNotFoundBoundary(
  routeByPattern({
    '/': <h1>Welcome!</h1>,
    '/about': <h1>About</h1>,
  }),
  (request) => <NotFound pathname={request.pathname} />,
)

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
    <Router fn={appRouter} requestService={requestService}>
      <nav>
        <Link to={basename}>Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to={basename + '/about'}>About</Link>
        &nbsp;&middot;&nbsp;
        <Link to={basename + '/not-found'}>Not Found</Link>
      </nav>
      <main>
        <RouterContent />
      </main>
    </Router>
  )
}

function NotFound({ pathname }: { pathname: string }) {
  return <h1>404 Not Found - {pathname}</h1>
}

export default App
