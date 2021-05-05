import React, { useMemo } from 'react'
import {
  Link,
  RouterProvider,
  RouterRequest,
  createBrowserHistory,
  createRequestService,
  useRouter,
} from 'retil-router'

function appRouter(req: RouterRequest) {
  switch (req.pathname) {
    case req.basename:
      return <h1>Welcome!</h1>

    case req.basename + '/about':
      return <h1>About</h1>

    default:
      return <h1>Not Found</h1>
  }
}

function App({ basename }: { basename: string }) {
  const requestService = useMemo(
    () =>
      createRequestService({
        basename,
        historyService: createBrowserHistory(),
      }),
    [basename],
  )

  const route = useRouter(appRouter, {
    requestService,
  })

  return (
    <RouterProvider value={route}>
      <nav>
        <Link to={basename}>Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to={basename + '/about'}>About</Link>
        &nbsp;&middot;&nbsp;
        <Link to={basename + '/not-found'}>Not Found</Link>
      </nav>
      <main>{route.content}</main>
    </RouterProvider>
  )
}

export default App
