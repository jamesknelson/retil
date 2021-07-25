import { css } from '@emotion/react'
import { Mount, MountedContent } from 'retil-mount'
import { MatchedLinkSurface, inToggledSurface } from 'retil-interaction'
import {
  getDefaultBrowserNavEnvService,
  loadMatch,
  loadNotFoundBoundary,
} from 'retil-nav'

const rootLoader = loadNotFoundBoundary(
  loadMatch({
    '/': <h1>Welcome!</h1>,
    '/about': <h1>About</h1>,
  }),
  (env) => <NotFound pathname={env.nav.pathname} />,
)

const NavLinkBody = (props: any) => {
  return (
    <span
      css={[
        inToggledSurface(css`
          color: red;
        `),
      ]}>
      {props.children}
    </span>
  )
}

function App() {
  const [navSource] = getDefaultBrowserNavEnvService()

  return (
    <Mount env={navSource} loader={rootLoader}>
      <nav>
        <MatchedLinkSurface href="/" match="/">
          <NavLinkBody>Home</NavLinkBody>
        </MatchedLinkSurface>
        &nbsp;&middot;&nbsp;
        <MatchedLinkSurface href="/about">
          <NavLinkBody>About</NavLinkBody>
        </MatchedLinkSurface>
        &nbsp;&middot;&nbsp;
        <MatchedLinkSurface href="/not-found">
          <NavLinkBody>Not Found</NavLinkBody>
        </MatchedLinkSurface>
      </nav>
      <MountedContent />
    </Mount>
  )
}

function NotFound({ pathname }: { pathname: string }) {
  return <h1>404 Not Found - {pathname}</h1>
}

export default App
