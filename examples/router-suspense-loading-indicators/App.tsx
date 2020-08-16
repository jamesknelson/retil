import * as React from 'react'

import { delay } from '../../packages/retil-common/src'
import {
  Link,
  RouterProvider,
  routeAsync,
  routeByPattern,
  useRouter,
} from '../../packages/retil-router/src'

const homeRouter = routeAsync(async () => {
  await delay(1000)
  return <h1>Welcome!</h1>
})

const aboutRouter = routeAsync(async () => {
  await delay(1000)
  return <h1>About</h1>
})

const appRouter = routeByPattern({
  '/': homeRouter,
  '/about': aboutRouter,
})

export function App() {
  const route = useRouter(appRouter, {
    transitionTimeoutMs: 500,
    unstable_isConcurrent: true,
  })

  return (
    <RouterProvider state={route}>
      <nav>
        <Link to="/">Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/about">About</Link>
      </nav>
      <main>
        {route.pending && 'loading concurrently...'}
        <React.Suspense fallback="loading fallback...">
          {route.content}
        </React.Suspense>
      </main>
    </RouterProvider>
  )
}
