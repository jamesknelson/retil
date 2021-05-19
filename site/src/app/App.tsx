import { css } from '@emotion/react'
import React from 'react'
import { useMountContent } from 'retil-mount'
import { useLink } from 'retil-nav'

function App() {
  const content = useMountContent<React.ReactNode>()

  const homeLink = useLink('/')
  const examplesLink = useLink('/examples')

  return (
    <>
      <nav>
        <a
          css={css`
            color: red;
          `}
          {...homeLink}>
          retil
        </a>
        &nbsp;&middot;&nbsp;
        <a {...examplesLink}>examples</a>
      </nav>
      <main>
        <React.Suspense fallback="loading fallback...">
          {content}
        </React.Suspense>
      </main>
    </>
  )
}

export default App
