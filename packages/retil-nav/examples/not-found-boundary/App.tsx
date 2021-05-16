import React from 'react'

import { MountProvider, useMount } from 'retil-loader'
import { match, notFoundBoundary } from 'retil-nav'

const rootLoader = notFoundBoundary(
  match({
    '/': <h1>Welcome!</h1>,
    '/about': <h1>About</h1>,
  }),
  (env) => <NotFound pathname={env.pathname} />,
)

function App({ basename }: { basename?: string }) {
  return (
    <Router basename={basename} fn={rootLoader}>
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
