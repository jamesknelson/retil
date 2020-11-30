import * as React from 'react'

import {
  Link,
  Router,
  RouterContent,
  routeByPattern,
  routeNotFoundBoundary,
} from '../../packages/retil-router/src'

const appRouter = routeNotFoundBoundary(
  routeByPattern({
    '/': <h1>Welcome!</h1>,
    '/about': <h1>About</h1>,
  }),
  (request) => <NotFound pathname={request.pathname} />,
)

export function App() {
  return (
    <Router fn={appRouter}>
      <nav>
        <Link to="/">Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/about">About</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/not-found">Not Found</Link>
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
