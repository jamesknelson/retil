import { Mount, MountedContent } from 'retil-mount'
import { NavLinkSurface } from 'retil-interaction'
import {
  getDefaultBrowserNavEnvService,
  loadMatch,
  loadNotFoundBoundary,
} from 'retil-nav'
import { useCSS } from 'retil-style'

const rootLoader = loadNotFoundBoundary(
  loadMatch({
    '/': <h1>Welcome!</h1>,
    '/about': <h1>About</h1>,
  }),
  (env) => <NotFound pathname={env.nav.pathname} />,
)

const NavLinkBody = (props: any) => {
  const media = useCSS()
  return (
    <span
      css={[
        media.localLink`
          color: red;
        `,
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
        <NavLinkSurface to="/" exact>
          <NavLinkBody>Home</NavLinkBody>
        </NavLinkSurface>
        &nbsp;&middot;&nbsp;
        <NavLinkSurface to="/about">
          <NavLinkBody>About</NavLinkBody>
        </NavLinkSurface>
        &nbsp;&middot;&nbsp;
        <NavLinkSurface to="/not-found">
          <NavLinkBody>Not Found</NavLinkBody>
        </NavLinkSurface>
      </nav>
      <MountedContent />
    </Mount>
  )
}

function NotFound({ pathname }: { pathname: string }) {
  return <h1>404 Not Found - {pathname}</h1>
}

export default App
