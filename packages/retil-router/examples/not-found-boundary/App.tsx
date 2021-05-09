import React from 'react'

import {
  Link,
  Router,
  RouterContent,
  routeByPattern,
  routeNotFoundBoundary,
} from 'retil-router'

const appRouter = routeNotFoundBoundary(
  routeByPattern({
    '/': <h1>Welcome!</h1>,
    '/about': <h1>About</h1>,
  }),
  (props) => <NotFound pathname={props.pathname} />,
)

function App({ basename }: { basename?: string }) {
  return (
    <Router basename={basename} fn={appRouter}>
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

export default App
