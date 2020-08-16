import * as React from 'react'

import {
  Link,
  RouterProvider,
  routeByPattern,
  routeNotFoundBoundary,
  useRouter,
} from '../../packages/retil-router/src'

const appRouter = routeNotFoundBoundary(
  routeByPattern({
    '/': <h1>Welcome!</h1>,
    '/about': <h1>About</h1>,
  }),
  (request) => <NotFound pathname={request.pathname} />,
)

export function App() {
  const route = useRouter(appRouter)

  return (
    <RouterProvider state={route}>
      <nav>
        <Link to="/">Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/about">About</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/not-found">Not Found</Link>
      </nav>
      <main>{route.content}</main>
    </RouterProvider>
  )
}

function NotFound({ pathname }: { pathname: string }) {
  return <h1>404 Not Found - {pathname}</h1>
}
