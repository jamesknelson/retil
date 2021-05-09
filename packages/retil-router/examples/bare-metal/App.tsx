import React, { useMemo } from 'react'
import {
  Link,
  RoutingProvider,
  getDefaultBrowserNavigationService,
  route,
  useRouteSource,
} from 'retil-router'
import { fuse } from 'retil-source'

// it's called "RetilRouterProps" because it covers all the props that router
// produced by retil itself require. your app can extend it to add other props,
// though
function appRouter(props: RetilRouterProps) {
  switch (props.pathname) {
    case props.basename:
      return <h1>Welcome!</h1>

    case props.basename + '/about':
      return <h1>About</h1>

    default:
      return <h1>Not Found</h1>
  }
}

function App({ basename }: { basename: string }) {
  const [
    navigationSource,
    navigationController,
  ] = getDefaultBrowserNavigationService()

  const routeSource = useMemo(
    () =>
      route(appRouter, navigationSource, {
        basename,
      }),
    [navigationSource, basename],
  )

  const routeSnapshot = useRouteSource(routeSource)

  return (
    <RoutingProvider
      routeSnapshot={routeSnapshot}
      navigationController={navigationController}>
      <nav>
        <Link to={basename}>Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to={basename + '/about'}>About</Link>
        &nbsp;&middot;&nbsp;
        <Link to={basename + '/not-found'}>Not Found</Link>
      </nav>
      <main>{routeSnapshot.content}</main>
    </RoutingProvider>
  )
}

export default App
