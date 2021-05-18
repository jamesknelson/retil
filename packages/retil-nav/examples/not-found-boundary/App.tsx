import React from 'react'
import { Mount, MountedContent } from 'retil-mount'
import { match, notFoundBoundary } from 'retil-nav'
import Link from 'retil-link'

const rootLoader = notFoundBoundary(
  match({
    '/': <h1>Welcome!</h1>,
    '/about': <h1>About</h1>,
  }),
  (env) => <NotFound pathname={env.pathname} />,
)

function App({ navSource }: { navSource: string }) {
  return (
    <Mount env={navSource} loader={rootLoader}>
      <nav>
        <Link to="/">Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/about">About</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/not-found">Not Found</Link>
      </nav>
      <MountedContent />
    </Mount>
  )
}

function NotFound({ pathname }: { pathname: string }) {
  return <h1>404 Not Found - {pathname}</h1>
}

export default App
