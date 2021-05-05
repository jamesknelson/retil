import React from 'react'
import { RouterService, RouterProvider, useRouterService } from 'retil-router'

import App from './app/App'
import { AppContext } from './appContext'
import { GlobalStyles } from './GlobalStyles'

export interface AppProps {
  routerService: RouterService<AppContext>
}

function Root(props: AppProps) {
  const { routerService } = props
  const router = useRouterService(routerService)

  return (
    <>
      <GlobalStyles />
      <RouterProvider value={router}>
        <App />
      </RouterProvider>
    </>
  )
}

export default Root
