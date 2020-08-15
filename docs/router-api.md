# API Reference

[**Components**](/docs/api.md#components)

- [`<RouterProvider>`](/docs/api.md#routerprovider)
- [`<Content>`](/docs/api.md#content)
- [`<Link>`](/docs/api.md#link)
- [`<NotFoundBoundary>`](/docs/api.md#notfoundboundary)

[**Hooks**](/docs/api.md#hooks)

- [`useContent()`](/docs/api.md#usecontent)
- [`useIsActive()`](/docs/api.md#useisactive)
- [`useIsRouterPending()`](/docs/api.md#useisrouterpending)
- [`useLink()`](/docs/api.md#uselink)
- [`useRequest()`](/docs/api.md#userequest)
- [`useRouterController()`](/docs/api.md#useroutercontroller)

[**Router helpers**](/docs/api.md#router-helpers)

- [`routeAsync()`](/docs/api.md#routeasync)
- [`routeLazy()`](/docs/api.md#routelazy)
- [`routeByPattern()`](/docs/api.md#routebypattern)
- [`routeRedirect()`](/docs/api.md#routeredirect)
- [`routeNotFound`](/docs/api.md#routenotfound)

[**Functions**](/docs/api.md#functions)

- [`parseAction()`](/docs/api.md#parsehref)
- [`parseAction()`](/docs/api.md#parsehref)
- [`createHref()`](/docs/api.md#createhref)
- [`getRouterSnapshot()`](/docs/api.md#getroutersnapshot)

[**Error handling**](/docs/api.md#error-handling)

- [`NotFoundError`](/docs/api.md#notfounderror)

[**Types**](/docs/api.md#types)

- [`Route`](/docs/api.md#route)
- [`RouterFunction`](/docs/api.md#routerfunction)
- [`RouterDelta`](/docs/api.md#routerdelta)
- [`RouterNavigation`](/docs/api.md#routernavigation)
- [`RouterRequest`](/docs/api.md#routerrequest)
- [`RouterResponse`](/docs/api.md#routerresponse)


## Components

### `<RouterProvider>`

This component goes at the top level of your app, configuring your app's routing and providing the routing context required by all other components and hooks.

#### Props

- `router` - **required** - [`Router`](#router)

  A function that returns the content for each new location that the user navigates to.
  
  Typically, you'll use router helpers like [`routeByPattern()`](#routebypattern) to create this function.

- `basename` - *optional* - `string`

  If specified, this will be added to the `basename` property of each the router's requests - ensuring that when this string appears at the beginning of the current URL, it'll be ignored by [`routeByPattern()`](#routebypattern) and other router helpers.

  Use this when you need to mount a RRL router under a subdirectory.

- `initialRoute` - *optional* - [`Route`](#route)

  If provided with a `Route` object (as returned by the promise returned by [`getRouterSnapshot()`](#getroutersnapshot)), this prop will be used as the current route until the first effect is able to be run.

  As effects will not run during server side rendering, this is useful for SSR. This can also be used to load asynchronous routes in legacy-mode React.
  
- `onResponseComplete` - *optional* - `(res: RouterResponse, req: RouterRequest) => void`

  If provided, this will be called with the final response object once a router has returned its final non-pending value.

  This is the only way to access the Response object outside of calling `getRouterSnapshot()` directly, as response objects will not always be available on the initial render in concurrent mode due to partial hydration.

- `transitionTimeoutMs` - *optional* - `number`

  *Defaults to 3000ms.*

  This value specifies the amount of time that the router should wait for asynchronous and suspenseful content to load before going ahead and rendering an incomplete route anyway.

  If you'd like to always immediately render each new route, set this to 0. If you'd like to always wait until each route is fully loaded before rendering, set this to `Infinity`.

- `unstable_concurrentMode` - *optional* - `boolean`

  Set this to `true` to opt into using React's concurrent mode internally for transitions (i.e. `useTransition()`). Note, this feature will only work when using React's experimental branch, and when rendering your app with `createRoot()`.
  
  This should have no affect on the router's behavior itself, but may improve performance and allow you to use concurrent mode features like `<SuspenseList>` alongside routing components like [`<Content>`](#content).


### `<Content>`

Renders the current route's content.

This component will suspend if rendering lazy or async content that is still pending, and will throw an error if something goes wrong while loading your request's content.

To access the content element directly, e.g. to create animated transitions, use the [`useContent()`](#usecontent) hook -- this component uses it internally.

#### Examples

Typically, you'll want to render the content inside a component that renders any fixed layout (e.g. a navbar), and inside a `<Suspense>` that renders a fallback until any async or lazy routes have loaded.

```tsx
export default function App() {
  return (
    <RouterProvider router={appRouter}>
      <AppLayout>
        <React.Suspense fallback={<AppSpinner />}>
          <Content />
        </React.Suspense>
      </AppLayout>
    </RouterProvider>
  )
}
```

### `<Link>`

Renders an `<a>` element that'll update the route when clicked.

To create custom link components, use the [`useLink()`](#uselink) and [`useIsActive()`](#useisactive) hooks -- this component uses them internally.

#### Props

Accepts most props that the standard `<a>` does, along with:

- `to` - **required** - `string | RouterDelta`

  The address to which the link should navigate on click. Can be an `/absolute` string, a string `./relative` to the current route, or a *RouterDelta* object containing one or more of the keys `pathname`, `search`, `hash`, `query` or `state`.

- `active` - *optional* - `boolean`

  Specify this to override whether this link is considered active (when deciding whether to apply `activeClassName` and `activeStyles`).

- `activeClassName` - *optional* - `string`

  A CSS class to apply to the rendered `<a>` element when the user is currently viewing the `pathname` underneath that specified by the `to` prop.

- `activeStyle` - *optional* - `object`

  A CSS style object to apply to the rendered `<a>` element when the user is currently viewing a `pathname` underneath that specified by the `to` prop.

- `disabled` - *optional* - `boolean`

  If `true`, clicking the link will not result in any action being taken.

- `exact` - *optional* - `boolean`

  If `true`, `activeClassName` and `activeStyle` will only be displayed if viewing the exact pathname specified by `to` - and not when viewing a descendent of it.

- `prefetch` - *optional* - `'hover' | 'mount'`

  If specified, a request with method `head` will be executed in the background when the user hovers over the link, or when the link is first mounted.

  Use this to improve performance by eagerly loading lazy routes.

- `replace` - *optional* - `boolean`

  Specifies that instead of pushing a new entry onto the browser history, the link should replace the existing entry.

- `state` - *optional* - `object`

  Specifies a state object to associate with the browser history entry.
  
  In requests produced by clicking the link, this `state` will be available at `request.state`.

#### Examples

```tsx
export function AppLayout({ children }) {
  return (
    <>
      <nav>
        <Link to="/" exact activeClassName="active" prefetch="hover">Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/about" activeClassName="active" prefetch="hover">About</Link>
      </nav>
      <main>
        {children}
      </main>
    </>
  )
}
```

### `<NotFoundBoundary>`

Use this to catch any [`NotFoundError`](#notfounderror) thrown within your [`<Content>`](#content) element, and render a user-friendly error message in its place.

#### Props

- `renderError` - **required** - `(error: NotFoundError) => ReactNode`

  This function should return a React Element that renders your Not Found message.

#### Examples

Generally, you'll want to place a `<NotFoundBoundary>` *within* your app's layout element, but *around* your `<Content>` element. This ensures that your not found message will be rendered inside your app layout.

```tsx
export default function App() {
  return (
    <RouterProvider router={appRouter}>
      <AppLayout>
        <React.Suspense fallback={<AppSpinner />}>
          <NotFoundBoundary renderError={() => <AppNotFoundPage />}>
            <Content />
          </NotFoundBoundary>
        </React.Suspense>
      </AppLayout>
    </RouterProvider>
  )
}
```


## Hooks

### `useContent()`

```tsx
const contentElement = useContent()
```

Returns the current route's content.

If stored in state, the element returned by this hook will always render a tree containing the original `request`. This makes it suitable for creating animated transitions between routes.


### `useIsActive()`

```tsx
const isActive = useIsActive(href, options?)
```

Returns `true` if the current request matches the specified `href`. If an `exact` option is passed, an exact match is required. Otherwise, any child of the specified `href` will also be considered a match.

#### Options

- `exact` - *optional* - `boolean`

  If `true`, the current route will only be considered active if it exactly matches the `href` passed as the first argument.

### `useLink()`

```tsx
const linkProps = useLink(href, options?)
```

Returns a props object that can be spread onto an `<a>` element to create links that integrate with the router.

These props can also be spread onto `<button>` and other components -- just remove the `href` prop.

#### Options

- `disabled` - *optional* - `boolean`

  If `true`, clicking the link will not result in any action being taken.

- `onClick` - *optional* - `Function`

- `onMouseEnter` - *optional* - `Function`

- `prefetch` - *optional* - `'hover' | 'mount'`

  If specified, a request with method `head` will be executed in the background when the user hovers over the link, or when the link is first mounted.

  Use this to improve performance by eagerly loading lazy routes.

- `replace` - *optional* - `boolean`

  Specifies that instead of pushing a new entry onto the browser history, the link should replace the existing entry.

- `state` - *optional* - `object`

  Specifies a state object to associate with the browser history entry.
  
  In requests produced by clicking the link, this `state` will be available at `request.state`.

#### Examples

By spreading the result of `useLink()`, you can use buttons from popular frameworks like Material UI as links.

```tsx
import Button from '@material-ui/core/Button'
import { useLink } from 'react-routing-library'

export function ButtonLink({ href, onClick, onMouseEnter, ...restProps }) {
  const linkProps = useLink(href, {
    onClick,
    onMouseEnter,
  })

  return (
    <Button {...linkProps} {...restProps} />
  )
}
```


### `useRouterController()`

```tsx
const { block, navigate, prefetch, ...other } = useRouterController()
```

Returns a [`RouterNavigation`](#routernavigation) object, which you can use to prefetch routes, block navigation, and perform programmatic navigation.


### `useIsRouterPending()`

```tsx
const pendingRequest = useIsRouterPending()
```

If a navigation action maps to a request with asynchronous content that has started loading but not yet been rendered, this will return the [`RouterRequest`](#routerrequest) object associated with action. Otherwise, it'll return `null`.

#### Examples

This hook is useful for rendering an app-wide loading bar at the top of your page.

```tsx
function App() {
  return (
    <RouterProvider router={appRouter}>
      <AppRouteLoadingIndicator />
      <AppLayout>
        <Suspense fallback={<Spinner />}>
          <RouterContent />
        </Suspense>
      </AppLayout>
    </RouterProvider>
  )
}

function AppRouteLoadingIndicator() {
  const pendingRequest = useIsRouterPending()
  return pendingRequest && <div className="AppRouteLoadingIndicator" />
}
```

### `useRequest()`

```tsx
const request = useRequest()
```

Returns the [`RouterRequest`](#routerrequest) object associated with the current route.


## Router helpers

### `routeAsync()`

```tsx
function routeAsync(
  asyncRouter: (request: Request, response: Response) => Promise<ReactNode>,
)
```

Creates a router that on *each and every* request, executes the provided asynchronous function.

Keep in mind that new requests will be generated each time you update the router function (e.g. to set the request's authentication details), or when the user navigates to a different `#hash` or `?query`. Because the function can be called so frequently, it should generally cache any information fetched from your server *outside* of the router itself.

Typical uses for `routeAsync()` including fetching any data reference in URL parameters, so that you can call [`routeNotFound`](#routenotfound) if the referenced data doesn't exist. You can also use `routeAsync()` to wait for data to load when implementing SSR.


### `routeLazy()`

```tsx
function routeLazy(
  load: () => Promise<{ default: Router }>,
)
```

Like React's `lazy()` function, this helper returns a router that suspends until the promise returned by its `load()` function has resolved. Use this to implement code-splitting with dynamic `import()` at the router level.

Note that the `load()` function will only ever be called once, and the result cached for future renders.

#### Examples

If your app has a number of large text-based pages that are infrequently viewed, e.g. including your privacy policy and terms of service, you may decide to split them out as so:

```tsx
const appRouter = routeByPattern({
  '/': <Home />,
  '/pages*': routeLazy(() => import('./pagesRouter'))
})
```

Then in your `pagesRouter` file, you can export a pattern router that loads the actual pages.

### `routeByPattern()`

```tsx
function routeByPattern(
  patterns: {
    [pattern: string]: ReactNode | Router
  },
)
```

Creates a router that switches between other routers based on the unmatched portion of the request's path.

Each new request is tested against each pattern in the order given, until a matching pattern is found. If no matching pattern is found, the [`routeNotFound`](#routenotfound) will be used.

In addition to mapping patterns to routers, it is also possible to map patterns to React elements -- which will be returned as is.

#### URL parameters

You can denote URL parameters with the `:` character. These should always come after any unchanging routes that follow the same format as the pattern.

```tsx
const blogRouter = routeByPattern({
  '/': <BlogIndex />,
  '/:id': (request) => <BlogPost id={request.params.id} />
})
```

#### Nesting pattern routers

You can nest routers -- but you'll need to add `/*` to the end of the path to indicate that any nested path should also be matched.

```tsx
const appRouter = routeByPattern({
  '/': <Landing />,
  '/blog/*': blogRouter
})
```

In the nested router, the `request.basename` property will be updated to include the matched portion of the pathname.


### `routeRedirect()`

```tsx
function routeRedirect(
  to:
    | string
    | RouterDelta<any>
    | ((request: RouterRequest) => string | RouterDelta<any>),
  status = 302,
)
```

Creates a router that when matched, redirects the user to another path.

The path can be specified as a bare string, or as a [`RouterDelta`](#routerdelta) object with the portions of the new URL that should differ from the matched URL.

#### Examples

Say you have an app with a number of steps, where each step is accessible at `/step/:number`. You'd like to make sure that if the user goes to the `/step` URL directly, they're redirected to `/step/1`.

```tsx
const stepRouter = routeByPattern({
  '/step/:number': req => <Step number={req.params.number} />,
  '/step': routeRedirect(req => req.pathname+'/1')
})
```


## Functions

### `createHref()`

```tsx
const href = createHref({ pathname, search, hash })
```

Joins the argument URL components together into a string href.


### `getRouterSnapshot()`

```tsx
const route = await getRouterSnapshot(router, href, options?)
```

Returns a promise to a [`Route`](#route) object containing the complete content and response for the given `href`.

The returned route can be passed to the `initialRoute` prop of `<RouterProvider>` when performing Server Side Rendering. It also allows you to inspect the full [`RouterResponse`](#routerresponse) object at `route.response`, which makes it possible to to set headers/status from your routes, and implement server-side HTTP redirects.

#### Options

- `basename` - *optional* - `string`

- `followRedirects` - *optional* - `boolean`

- `method` - *optional* - `string`

  *Defaults to `GET`.*`


### `parseHref()`

```tsx
const delta = parseHref(href, state?)
```

Takes a string or object `href`, and optionally a `state` object, and returns a [`RouterDelta`](#routerdelta) object containing the individual parts of the provided inputs.


## Error handling

### `NotFoundError`

```tsx
import { NotFoundError } from 'react-routing-library'

const error = new NotFoundError(request)

error.request // returns a RouterRequest
```

This is the error thrown by `routeByPattern()` when it can't match a URL, and the error which `<NotFoundBoundary>` looks for to render a not found page.

You can catch this error in your own components if you'd like to implement custom behavior for not found errors.

### `routeNotFound`

```tsx
import { routeNotFound } from 'react-routing-library'
```

This is a router function that will always render a component that throws a `NotFoundError`. You can conditionally call this router function in your own routers if you'd like to conditionally throw a not found error.


## Types

RRL is built with TypeScript. It exports the following types for public use.

### `Route`

The object returned by [`getRouterSnapshot()`](#getroutersnapshot), and accepted as the `initialRoute` prop of `<RouterProvider>`.e

```tsx
interface Route {
  content: ReactNode
  request: RouterRequest
  response: Response
}
```


### `Router`

A function that maps a [`RouterRequest`](#routerrequest) to a React element, and optionally may mutate the response object.

```tsx
type Router<
  Request extends RouterRequest = RouterRequest
> = (request: Request, response: Response) => ReactNode
```

Routers are generic on their Request type. This means that your app can have a custom Router/Request type that specifies information specific to your app -- for example, a `currentUser` object.

```ts
interface AppRequest extends RouterRequest {
  currentUser: AppCurrentUser
}

type AppRouter = Router<AppRequest>
```

Bear in mind that `<RouterProvider>` and `getRouterSnapshot()` expect a base `RouterRequest` object, so you'll always want your root-level router to accept a plain `RouterRequest`. The root router can then create an extended request object, and pass it to its child router.

When creating this router within a component, e.g. to access component state, you'll want to make sure to memoize it with `useCallback()` so that you're not creating a new router -- and recomputing the route -- on every render.

```tsx
const rootRouter = useCallback((request: RouterRequest, response: RouterResponse) => {
  const appRequest: AppRequest = {
    ...request, 
    currentUser
  }
  return appRouter(appRequest, response)
}, [currentUser])
```


### `RouterDelta`

An object used to represent a change (or *delta*) from the current path. `undefined` values represent no change from the current value.

```tsx
interface RouterDelta {
  hash?: string
  pathname?: string
  query?: { [key: string]: string | string[] }
  search?: string
  state?: object
}
```

### `RouterNavigation`

An object providing functions to control the router programmatically.

The promises returned by some functions in this object will resolve once navigation and routing has completed.

```tsx
interface RouterNavigation {
  back(): Promise<void>
  block(blockerFn): () => void
  navigate(delta, options?): Promise<void>
  prefetch(delta, options?): Promise<Route>
  reload(): Promise<void>
}
```


### `RouterRequest`

An object representing a single location in your browser history, or a single server-side request.

```tsx
interface RouterRequest {
  basename: string
  hash: string
  key: string
  method: string
  params: { [name: string]: string | string[] }
  pathname: string
  query: { [key: string]: string | string[] }
  search: string
  state: object
}
```

#### Query vs. Params

The `query` object contains a parsed version of your URL's `search` string, i.e. the part of the URL starting at (and including) the `?` character (if it exists), and ending before any `#` characters.

The `params` object contains any URL parameters parsed out of a pattern passed to `routeByPattern()`.

For example, say you have the following router:

```tsx
routeByPattern(() => {
  '/profile/:username': req => <Profile request={req} />
})
```

In this case, if you navigate to `/profile/clark-kent?r=lois`, the request prop will contain the following:

```ts
props.request.params // { username: 'clark-kent' }
props.request.query // { r: 'lois' }
```

#### Methods

When doing prefetching, sometimes you'll want to take a different action to when you're loading a route for real. Because of this, requests made by a call to `prefetch()` will have a value of `HEAD` under `request.method`, while all other automatically-generated requests will have a method of `GET`.

It's also possible to manually specify a method by passing a `method` option to `navigation.navigate()` or `navigation.prefetch()`. In this case, `request.method` will initially contain whatever value you passed in -- but if that request is ever revisited by navigating back/forward, it'll revert to `GET`.


### `RouterResponse`

A mutable object used to pass metadata from `Router` functions to the router itself, and to the server when doing SSR.

*You probably don't need to touch this object directly, except when passing it to the second argument of your router functions.*

```tsx
interface RouterResponse {
  error?: any
  head: ReactElement[]
  headers: { [name: string]: string }
  pendingCommits: PromiseLike<any>[]
  pendingSuspenses: PromiseLike<any>[]
  status?: number
```
