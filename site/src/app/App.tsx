import React from 'react'
import {
  Link,
  useRouterContent,
  // useRouterPending,
} from 'retil-router'

function App() {
  const content = useRouterContent()
  // const pending = useRouterPending()

  return (
    <>
      <nav>
        <Link to="/">retil</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/examples">examples</Link>
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
