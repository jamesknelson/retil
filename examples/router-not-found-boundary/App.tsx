import * as React from 'react'

import {
  Link,
  NotFoundBoundary,
  RouterProvider,
  routeByPattern,
  useRouter,
} from '../../packages/retil-router/src'

const appRouter = routeByPattern({
  '/': <h1>Welcome!</h1>,
  '/about': <h1>About</h1>,
})

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
        <NotFoundBoundary renderError={() => <h1>404 Not Found</h1>}>
          {route.content}
        </NotFoundBoundary>
      </main>
    </RouterProvider>
  )
}
