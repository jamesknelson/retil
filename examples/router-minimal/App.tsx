import * as React from 'react'

import {
  Content,
  Link,
  RouterProvider,
  RouterRequest,
  useRouter,
} from '../../packages/retil-router/src'

function appRouter(req: RouterRequest) {
  switch (req.pathname) {
    case '/':
      return <h1>Welcome!</h1>

    case '/about':
      return <h1>About</h1>

    default:
      return <h1>Not Found</h1>
  }
}

export function App() {
  const [route, controller] = useRouter(appRouter)

  return (
    <RouterProvider route={route} controller={controller}>
      <nav>
        <Link to="/">Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/about">About</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/not-found">Not Found</Link>
      </nav>
      <main>
        <Content />
      </main>
    </RouterProvider>
  )
}