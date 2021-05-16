import React, { useMemo } from 'react'
import { MountProvider, load, useMount } from 'retil-loader'
import {
  NavEnv,
  NavProvider,
  createBrowserNavService,
  useLink,
} from 'retil-nav'

interface Env extends NavEnv {}

// it's called "RetilRouterProps" because it covers all the props that router
// produced by retil itself require. your app can extend it to add other props,
// though
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

const Link = ({ to, children }: { to: string; children: React.ReactNode }) => {
  const linkProps = useLink(to)
  return <a {...linkProps}>{children}</a>
}

function App({ basename }: { basename: string }) {
  const [navSource, navController] = useMemo(
    () => createBrowserNavService({ basename }),
    [basename],
  )

  const rootSource = useMemo(
    () => load(rootLoader, (use) => use(navSource)),
    [navSource],
  )

  const mount = useMount(rootSource)

  return (
    <MountProvider value={mount}>
      <NavProvider controller={navController}>
        <nav>
          <Link to={basename}>Home</Link>
          &nbsp;&middot;&nbsp;
          <Link to={basename + '/about'}>About</Link>
          &nbsp;&middot;&nbsp;
          <Link to={basename + '/not-found'}>Not Found</Link>
        </nav>
        <main>{mount.content}</main>
      </NavProvider>
    </MountProvider>
  )
}

export default App
