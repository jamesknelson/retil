<h1 align="center">
  retil-router
</h1>

<h4 align="center">
  Superpowers for React Developers
</h4>

<p align="center">
  <a href="https://www.npmjs.com/package/retil-router"><img alt="NPM" src="https://img.shields.io/npm/v/retil-router.svg"></a>
</p>


## Getting Started

```bash
yarn add retil-router
```

- [**Read the 2-minute primer**](#2-minute-primer)
<!-- - Why React Routing Library? *(coming soon*)* -->
<!-- - [View the guided examples &raquo;](./examples) -->
- [View the API reference &raquo;](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md)
<!-- - Try a Real-world example on CodeSandbox &raquo; *(coming soon)* -->


## 2-minute primer

**Your router just is a function.**

With retil-router, a **router** is a function that maps a request to an element.

```ts
type RouterFunction = (request: RouterRequest) => ReactNode
```

You've seen this before -- its a lot like a React component.

```tsx
const router = request => {
  switch (request.pathname) {
    case '/':
      return <h1>Home</h1>

    case '/about':
      return <h1>About</h1>

    default:
      return <h1>Not Found</h1>
  }
}
```

Once you have a router function, just pass it to `useRouter` to get your `route` -- your current route's content is available on the `content` property.

```tsx
import { useRouter } from 'retil-router'

export default function App() {
  const route = useRouter(router)
  return route.content
}
```

Routers-as-functions is the underlying secret that makes retil-router so powerful. Most of the time though, it's easier to let retil-router create the router functions for you. For example, the above router could be created with `routeByPattern()`.

```tsx
import { routeByPattern } from 'retil-router'

const router = routeByPattern({
  '/': <h1>Home</h1>,
  '/about': <h1>About</h1>
})
```

If you want to use retil-router's built in `<Link>` component and redirect routes, you'll need to make sure they can access the current route and `navigate()` function. You can do this by wrapping your app with a `<RouterProvider>`.

```tsx
import { RouterProvider, useRouter } from 'retil-router'

export default function App() {
  const route = useRouter(router)
  
  return (
    <RouterProvider value={route}>
      {route.content}
    </RouterProvider>
  )
}
```

Naturally, your `route.content` element can be nested inside other elements. This lets you easily add layout elements -- like a site-wide navigation bar. And hey presto -- you've now built a simple app with push-state routing!

[*View this example live at CodeSandbox &raquo;*](https://codesandbox.io/s/rrl-minimal-vsdsd)

```tsx
import { Link, RouterProvider, useRouter } from 'retil-router'

function AppLayout({ children }) {
  return (
    <>
      <header>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </header>
      <main>
        {children}
      </main>
    </>
  )
}

export default function App() {
  const route = useRouter(router)
  
  return (
    <RouterProvider value={route}>
      <AppLayout>
        {route.content}
      </AppLayout>
    </RouterProvider>
  )
}
```

<!--

TODO

## Examples and guides

- [Minimal live example]()
- [Full real-world live example]()

--- 

- [Route parameters guide]()
- [Not found boundaries guide](./examples/not-found-boundary)
- [Redirects guide]()
- [Nested routers guide]()
- [Nested layouts guide]()
- [Concurrent mode guide]()
- [Pre-caching data guide]()
- [Loading indicators guide]()
- [Animated transitions guide]()
- [Authentication guide]()
- [SSR guide]()

-->


## [API Docs](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md)

[**Components**](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#components)

- [`<Link>`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#link)
- [`<RouterProvider>`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#routerprovider)

[**Hooks**](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#hooks)

- [`useLink()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#uselink)
- [`useMatch()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#usematch)
- [`useRequest()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#userequest)
- [`useRouter()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#userouter)
- [`useRouterController()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#useroutercontroller)

[**Router function helpers**](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#router-function-helpers)

- [`routeAsync()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#routeasync)
- [`routeByPattern()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#routebypattern)
- [`routeLazy()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#routelazy)
- [`routeNotFound()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#routenotfound)
- [`routeNotFoundBoundary()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#routenotfoundboundary)
- [`routeRedirect()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#routeredirect)

[**Functions**](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#functions)

- [`createHref()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#createhref)
- [`getInitialStateAndResponse()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#getinitialstateandresponse)
- [`parseAction()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#parseaction)
- [`resolveAction()`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#resolveaction)

[**Types**](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#types)

- [`RouterAction`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#routeraction)
- [`RouterController`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#routercontroller)
- [`RouterFunction`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#routerfunction)
- [`RouterRequest`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#routerrequest)
- [`RouterResponse`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#routerresponse)
- [`RouterState`](https://github.com/jamesknelson/retil/blob/master/docs/router-api.md#routerstate)


## License

MIT License, Copyright &copy; 2020 James K. Nelson
