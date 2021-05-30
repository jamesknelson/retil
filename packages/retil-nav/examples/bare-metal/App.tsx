import React, { ReactElement, useMemo } from 'react'
import { Mount, LoaderProps, useMountContent, useMountEnv } from 'retil-mount'
import {
  NavEnv,
  NavProvider,
  createBrowserNavEnvService,
  joinPathnames,
  useNavLink,
} from 'retil-nav'

function rootLoader(props: LoaderProps<NavEnv>) {
  switch (props.nav.pathname) {
    case props.nav.basename:
      return <h1>Welcome!</h1>

    case props.nav.basename + '/about':
      return <h1>About</h1>

    default:
      return <h1>Not Found</h1>
  }
}

export function App({ basename }: { basename: string }) {
  const [navEnvSource, navController] = useMemo(
    () => createBrowserNavEnvService({ basename }),
    [basename],
  )

  return (
    // A <NavProvider> is only necessary when we're not using the default
    // browser nav service.
    <Mount env={navEnvSource} loader={rootLoader}>
      <NavProvider controller={navController}>
        <nav>
          <Link to="/">Home</Link>
          &nbsp;&middot;&nbsp;
          <Link to="/about">About</Link>
          &nbsp;&middot;&nbsp;
          <Link to="/not-found">Not Found</Link>
        </nav>
        <Content />
      </NavProvider>
    </Mount>
  )
}

const Content = () => useMountContent<ReactElement>()

const Link = ({ to, children }: { to: string; children: React.ReactNode }) => {
  const env = useMountEnv<NavEnv>()
  const linkProps = useNavLink(joinPathnames(env.nav.basename, to))
  return <a {...linkProps}>{children}</a>
}

export default App
