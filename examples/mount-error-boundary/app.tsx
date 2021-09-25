import { css } from '@emotion/react'
import { Mount, MountedContent } from 'retil-mount'
import { MatchedLinkSurface, inToggledSurface } from 'retil-interaction'
import { getDefaultBrowserNavEnvService, loadMatch } from 'retil-nav'

import { ErrorBoundary } from './error-boundary'

const rootLoader = loadMatch({
  '/': <h1>Welcome!</h1>,
  '/about': <h1>About</h1>,
  '/error': () => {
    throw new Error('oh no!')
  },
})

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
    <ErrorBoundary FallbackComponent={ErrorFallback}>
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
          <MatchedLinkSurface href="/error">
            <NavLinkBody>Error</NavLinkBody>
          </MatchedLinkSurface>
        </nav>
        <MountedContent />
      </Mount>
    </ErrorBoundary>
  )
}

interface ErrorFallbackProps {
  error: any
  resetErrorBoundary: (...args: Array<unknown>) => void
}

function ErrorFallback({ error }: ErrorFallbackProps) {
  return (
    <>
      <h1>Error</h1>
      <pre>{error.toString()}</pre>
    </>
  )
}

export default App
