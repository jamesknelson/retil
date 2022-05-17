import { css } from '@emotion/react'
import styled from '@emotion/styled'
import { MatchedLinkSurface } from 'retil-interaction'
import { Mount, useMountContent } from 'retil-mount'
import { NavEnv, loadMatch } from 'retil-nav'
import { Source } from 'retil-source'
import { ColumnTransition } from 'retil-transition'

export interface AppProps {
  env: AppEnv | Source<AppEnv>
}

export interface AppEnv extends NavEnv {}

export function App({ env }: AppProps) {
  return (
    <Mount env={env} loader={appLoader}>
      <AppContent />
    </Mount>
  )
}

function AppContent() {
  const content = useMountContent() as React.ReactElement

  return (
    <>
      <nav
        css={css`
          display: flex;
          align-items: center;
          height: 30px;
          padding-left: 0.5rem;
          border-bottom: 1px solid #f0f0f0;
        `}>
        <MatchedLinkSurface href="/" match="/" matchStyle={{ color: 'red' }}>
          Home
        </MatchedLinkSurface>
        &nbsp;&middot;&nbsp;
        <MatchedLinkSurface href="/about" matchStyle={{ color: 'red' }}>
          About
        </MatchedLinkSurface>
      </nav>
      <main
        css={css`
          display: flex;
          flex-direction: column;
          background-color: #f6f8fa;
          flex-grow: 1;
        `}>
        <ColumnTransition
          css={css`
            flex-grow: 1;
          `}
          transitionKey={content.key}>
          {content}
        </ColumnTransition>
      </main>
    </>
  )
}

const Card = styled.div`
  background-color: white;
  flex-grow: 0;
  border-radius: 8px;
  box-shadow: 0 0 3px 3px rgba(0, 0, 0, 0.03);
  margin: 0.5rem;
  padding: 0.5rem;
`

export const appLoader = loadMatch({
  '/': (
    <Card key="home">
      <h1>Welcome</h1>
      <p>Click the "about" tab to see a transition into it.</p>
    </Card>
  ),
  '/about': (
    <Card key="about">
      <h1>About</h1>
      <p>
        The &lt;TransitionColumn&gt; component holds a fixed size while the
        transition is occuring.
      </p>
    </Card>
  ),
})
