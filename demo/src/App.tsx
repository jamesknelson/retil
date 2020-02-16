import { createBrowserHistory } from 'history'
import React, { Suspense, useEffect, useState } from 'react'

import { NavigationContext } from './context'
import Post from './routes/Post'
import User from './routes/User'
import UserList from './routes/UserList'
import { normalizePathname } from './utils/normalizePathname'

const history = createBrowserHistory()
const navigate = (path: string) => history.push(path)

function getRoute(context: NavigationContext) {
  switch (context.route) {
    case 'post':
      return <Post id={context.id!} />

    case 'user':
      return <User id={context.id!} />

    default:
      return <UserList />
  }
}

export default function App() {
  const [location, setLocation] = useState(history.location)
  const [, route, id] = normalizePathname(location.pathname).split('/')
  const navigationContext = {
    route,
    id,
    navigate,
  }

  useEffect(() => history.listen(setLocation), [])

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NavigationContext.Provider value={navigationContext}>
        {getRoute(navigationContext)}
      </NavigationContext.Provider>
    </Suspense>
  )
}
