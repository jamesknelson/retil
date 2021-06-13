import React, { ReactElement } from 'react'
import { EnvSource, Mount, LoaderProps, useMountContent } from 'retil-mount'
import { NavEnv, useNavLinkProps, useNavMatch } from 'retil-nav'

export interface AppEnv extends NavEnv {}

export function appLoader({ nav }: LoaderProps<AppEnv>) {
  switch (nav.pathname) {
    case nav.matchname:
      return <h1>Welcome!</h1>

    case nav.matchname + '/about':
      return <h1>About</h1>

    default:
      return <h1>Not Found</h1>
  }
}

export interface AppProps {
  env: AppEnv | EnvSource<AppEnv>
}

export function App({ env }: AppProps) {
  return (
    <Mount env={env} loader={appLoader}>
      <nav>
        <Link to="/">Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/about">About</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/not-found">Not Found</Link>
      </nav>
      <Content />
    </Mount>
  )
}

const Content = () => useMountContent<ReactElement>()

const Link = ({ to, children }: { to: string; children: React.ReactNode }) => {
  const linkProps = useNavLinkProps(to)
  const match = useNavMatch()
  return (
    <a {...linkProps} style={{ color: match(to) ? 'red' : 'black' }}>
      {children}
    </a>
  )
}

export default App
