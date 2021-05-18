import React, { ReactElement, useMemo } from 'react'
import { Mount, useMountContent, useMountEnv } from 'retil-mount'
import {
  NavEnv,
  NavProvider,
  createBrowserNavService,
  joinPathnames,
  useLink,
} from 'retil-nav'

interface Env extends NavEnv {}

function rootLoader(env: Env) {
  switch (env.pathname) {
    case env.basename:
      return <h1>Welcome!</h1>

    case env.basename + '/about':
      return <h1>About</h1>

    default:
      return <h1>Not Found</h1>
  }
}

export function App({ basename }: { basename: string }) {
  const [navSource, navController] = useMemo(
    () => createBrowserNavService({ basename }),
    [basename],
  )

  return (
    // A <NavProvider> is only necessary when we're not using the default
    // browser nav service.
    <NavProvider controller={navController}>
      <Mount env={navSource} loader={rootLoader}>
        <nav>
          <Link to="/">Home</Link>
          &nbsp;&middot;&nbsp;
          <Link to="/about">About</Link>
          &nbsp;&middot;&nbsp;
          <Link to="/not-found">Not Found</Link>
        </nav>
        <Content />
      </Mount>
    </NavProvider>
  )
}

const Content = () => useMountContent<ReactElement>()

const Link = ({ to, children }: { to: string; children: React.ReactNode }) => {
  const env = useMountEnv<Env>()
  const linkProps = useLink(joinPathnames(env.basename, to))
  return <a {...linkProps}>{children}</a>
}

export default App
