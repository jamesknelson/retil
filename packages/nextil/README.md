# nextil

**The missing piece of Next.js.**

Declarative bits and pieces for Next.js, including:

- Redirects
- Not found pages
- Page loading bars
- Nested layouts and routes
- Powerful dynamic parameters


## Getting started

```bash
yarn add nextil
```


### The App Wrapper

You'll need to add a `useRouter()` in your app component -- just like with any retil app. However, unlike CRA-based retil apps, you'll get a `nextilRouter` prop containing the router function for the current page.

To get access to the `nextilRouter` prop, you'll need to wrap your `App` component with the `nextilApp` function.

```tsx
import { NextilAppProps, nextilApp } from 'nextil'
import * as React from 'react
import { RouterProvider } from 'retil-router'

interface AppProps extends NextAppProps, NextilAppProps {}

function App({ nextilRouter }: AppProps) {
  const route = useRouter(nextilRouter)

  return (
    <RouterProvider state={route}>
      <YourAppLayout showLoadingBar={route.pending}>
        {route.content}
      </YourAppLayout>
    </RouterProvider>
  )
}

export default nextilApp(App)
```


### Adding routes

With your App component set up, all that's left is to add your routes!

Nextil supports standard Next component routes out of the box. But when your page follow is name like `[[...route]].tsx`, `[[...wildcard]].js`, etc. -- Nextil will treat the page as exporting a [Retil Router Function](https://github.com/jamesknelson/retil/tree/master/packages/retil-router#2-minute-primer). For example:

```tsx
import { routeByPattern, routeRedirect } from 'retil-router'

const router = routeByPattern({
  '/': routeRedirect('/landing'),
  '/landing': <h1>Landing</h1>,
  '/dashboard': <h1>About</h1>
})

export default router
```


## License

MIT License, Copyright &copy; 2020 James K. Nelson
