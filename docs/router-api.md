# API Reference

[**Components**](/docs/router-api.md#components)

- [`<Link>`](/docs/router-api.md#link)
- [`<RouterProvider>`](/docs/router-api.md#routerprovider)

[**Hooks**](/docs/router-api.md#hooks)

- [`useLink()`](/docs/router-api.md#uselink)
- [`useLinkActive()`](/docs/router-api.md#uselinkactive)
- [`useRouterRequest()`](/docs/router-api.md#userouterrequest)
- [`useRouter()`](/docs/router-api.md#userouter)
- [`useRouterController()`](/docs/router-api.md#useroutercontroller)

[**Router function helpers**](/docs/router-api.md#router-function-helpers)

- [`routeAsync()`](/docs/router-api.md#routeasync)
- [`routeByPattern()`](/docs/router-api.md#routebypattern)
- [`routeLazy()`](/docs/router-api.md#routelazy)
- [`routeNotFound()`](/docs/router-api.md#routenotfound)
- [`routeNotFoundBoundary()`](/docs/router-api.md#routenotfoundboundary)
- [`routeRedirect()`](/docs/router-api.md#routeredirect)

[**Functions**](/docs/router-api.md#functions)

- [`applyAction()`](/docs/router-api.md#applyaction)
- [`createHref()`](/docs/router-api.md#createhref)
- [`getInitialStateAndResponse()`](/docs/router-api.md#getinitialstateandresponse)
- [`parseAction()`](/docs/router-api.md#parseaction)

[**Types**](/docs/router-api.md#types)

- [`RouterAction`](/docs/router-api.md#routeraction)
- [`RouterController`](/docs/router-api.md#routercontroller)
- [`RouterFunction`](/docs/router-api.md#routerfunction)
- [`RouterRequest`](/docs/router-api.md#routerrequest)
- [`RouterResponse`](/docs/router-api.md#routerresponse)
- [`RouterState`](/docs/router-api.md#routerstate)


## Components

### `<Link>`

*`<Link>` requires that your app is wrapped with a [`<RouterProvider>`](#routerprovider) component.*

Renders an `<a>` element that'll update the route when clicked.

To create custom link components, use the [`useLink()`](#uselink) and [`useLinkActive()`](#uselinkactive) hooks -- this component uses them internally.

#### Props

Accepts most props that the standard `<a>` does, along with:

- `to` - **required** - `string | RouterAction`

  The address to which the link should navigate on click. Can be an `/absolute` string, a string `./relative` to the current route, or a *RouterAction* object containing one or more of the keys `pathname`, `search`, `hash`, `query` or `state`.

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
        <Link to="/" exact activeClassName="active">Home</Link>
        &nbsp;&middot;&nbsp;
        <Link to="/about" activeClassName="active">About</Link>
      </nav>
      <main>
        {children}
      </main>
    </>
  )
}
```

### `<RouterProvider>`

This component configures the routing state that is visible to your routing hooks, `<Link>` components, `routeRedirect()` routers.

Generally, you'll wrap your `<App>` component's content with a `<RouterProvider>`, and pass in the result of [`useRouter()`](#userouter) as its `router` prop. Here's an example:

```tsx
import { RouterProvider, useRouter } from 'retil-router'

export default function App() {
  const route = useRouter(appRouter)
  
  return (
    <RouterProvider state={route}>
      {route.content}
    </RouterProvider>
  )
}
```

#### Props

- `controller` - *required* - [`RouterController`](#routercontroller)

  Configures how your `<Link>` components and `routeRedirect()` routers will navigate between pages.

- `route` - *optional* - [`RouterState`](#routerstate)

  Configures the currently active route, as returned by [`useRouterRequest()`](#userouterrequest) and used by [`useLinkActive()`](#uselinkactive).


## Hooks

### `useLink()`

*`useLink()` requires that your app is wrapped with a [`<RouterProvider>`](#routerprovider) component.*

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
import { useLink } from 'retil-router'

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


### `useLinkActive()`

*`useLinkActive()` requires that your app is wrapped with a [`<RouterProvider>`](#routerprovider) component.*

```tsx
const isActive = useLinkActive(href, options?)
```

Returns `true` if the current request matches the specified `href`. If an `exact` option is passed, an exact match is required. Otherwise, any child of the specified `href` will also be considered a match.

#### Options

- `exact` - *optional* - `boolean`

  If `true`, the current route will only be considered active if it exactly matches the `href` passed as the first argument.


### `useRouterRequest()`

*`useRouterRequest()` requires that your app is wrapped with a [`<RouterProvider>`](#routerprovider) component.*

```tsx
const request = useRouterRequest()
```

Returns the [`RouterRequest`](#routerrequest) object associated with the current route.


### `useRouterController()`

*`useRouterController()` requires that your app is wrapped with a [`<RouterProvider>`](#routerprovider) component.*

```tsx
const { back, block, navigate, prefetch } = useRouterController()
```

Returns a [`RouterController`](#routercontroller) object, which you can use to prefetch routes, block navigation, and perform programmatic navigation.


### `useRouter()`

```tsx
const [route, controller] = useRouter(routerFunction, options?)
```

Hooks up routing for your application.

The first argument is the [router function](#routerfunction) that'll be called each time the user navigates, and each time the given function changes. You can create router functions through retil-router's [Router function helpers](#router-function-helpers), or by supplying a function yourself that maps a [`RouterRequest`] to a React element.

Returns an array containing a [`RouterState`](#routerstate) object with details on the current route, and a [`RouterController`](#routercontroller) that allows you to programmatically navigate, block navigation, or prefetch routes.

Typically, you'll pass the returned `route` and `controller` objects to your `<RouterProvider>`, and then use `route.content` and `route.pending` to render your app's content and page loading bar.

```tsx
export default function App() {
  const route = useRouter(router)

  return (
    <RouterProvider state={route}>
      <AppLayout>
        {route.pending && <AppLoadingBar />}
        <React.Suspense fallback={<AppSpinner />}>
          {route.content}
        </React.Suspense>
      </AppLayout>
    </RouterProvider>
  )
}
```

#### Options

- `basename` - *optional* - `string`

  If specified, this will be added to the `basename` property of each the router's requests - ensuring that when this string appears at the beginning of the current URL, it'll be ignored by [`routeByPattern()`](#routebypattern) and other router helpers.

  Use this when you need to mount a retil-router router under a subdirectory.

- `initialRoute` - *optional* - [`RouterState`](#routerstate)

  If provided with a `Route` object (as returned by the promise returned by [`getInitialStateAndResponse()`](#getinitialstateandresponse)), this prop will be returned as the current route until the first effect is able to be run. As effects will not run during server side rendering, this allows you to provide a ready-to-render route during SSR. It can also be used to load asynchronous routes in legacy-mode React.
  
- `onResponseComplete` - *optional* - `(res: RouterResponse, req: RouterRequest) => void`

  If provided, this will be called with the final response object once a router has returned its final non-pending value.

  This is the only way to access the Response object outside of calling `getInitialStateAndResponse()` directly, as response objects will not always be available on the initial render in concurrent mode due to partial hydration.

- `transformRequest` - *optional* - `(req: RouterRequest) => RouterRequest & Ext`

  If provided, each request will be passed through this function before being passed to the router function. This allows you to extend the request with application-specific information. A common use case would be to add a `currentUser` property to the request.

  Note that each time this property changes to a new value, it'll cause your route to be re-computed. Memoize this where possible to ensure performant routing.

- `transitionTimeoutMs` - *optional* - `number`

  *Defaults to 3000ms.*

  This value specifies the amount of time that the router should wait for asynchronous and suspenseful content to load before going ahead and rendering an incomplete route anyway.

  If you'd like to always immediately render each new route, set this to 0. If you'd like to always wait until each route is fully loaded before rendering, set this to `Infinity`.

- `unstable_isConcurrent` - *optional* - `boolean`

  Set this to `true` to opt into using React's concurrent mode internally for transitions (i.e. `useTransition()`). Note, this feature will only work when using React's experimental branch, and when rendering your app with `createRoot()`.
  
  The advantage to putting the router into concurrent mode is that it allows the router to wait for `React.lazy` components and suspense-based data fetching to complete before transitioning to the next route. It also allows the `route.pending` flag to track React's suspense state.


## Router creators

All functions starting with the `route` prefix will return a [`RouterFunction`](#routerfunction), which can be passed as the first argument of [`useRouter`](#userouter).

### `routeAsync()`

```tsx
function routeAsync(
  asyncRouter: (request: Request, response: Response) => Promise<ReactNode>,
): RouterFunction
```

Creates a router that on *each and every* request, executes the provided asynchronous function.

Keep in mind that new requests will be generated each time you update the router function (e.g. to set the request's authentication details), or when the user navigates to a different `#hash` or `?query`. Because the function can be called so frequently, it should generally cache any information fetched from your server *outside* of the router itself.

Typical uses for `routeAsync()` including fetching any data reference in URL parameters, so that you can call [`routeNotFound`](#routenotfound) if the referenced data doesn't exist. You can also use `routeAsync()` to wait for data to load when implementing SSR.


### `routeByPattern()`

```tsx
function routeByPattern(
  patterns: {
    [pattern: string]: ReactNode | Router
  },
): RouterFunction
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


### `routeLazy()`

```tsx
function routeLazy(
  load: () => Promise<{ default: Router }>,
): RouterFunction
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


### `routeNotFound()`

```tsx
function routeNotFound(): RouterFunction
```

Returns a router function that will set the response's status code to 404, and throw a `NotFoundError`. You can conditionally use this router function in your own routers if you'd like to conditionally throw a not found error -- e.g. for when an id specified in the route parameters can't be found in the database.

To handle the errors thrown by this router function, use `routeNotFoundBoundary()`.


### `routeNotFoundBoundary()`

```tsx
function routeNotFound(
  routerFunction,
  fallbackRouterFunction
): RouterFunction
```

Handles the `NotFoundError` objects thrown by [`routeNotFound()`](#routeNotFound) routerFunctions.

To use `routeNotFoundBoundary()`, you'll need two router functions: the main router function, and a fallback to use in its place in case the main router throws a `NotFoundError`.

If your app has more than one not found boundary, the innermost one will be used. This allows you to render 404 messages inside of custom layouts.

At minimum, you'll usually want to place a `routeNotFoundBoundary` at the top level of your app. 

```tsx
const appRouter = 
  routeNotFoundBoundary(
    routeByPattern({
      '/home': () => <Home />
      '/about': () => <About />
    }),
    () => <NotFoundMessage />
  )
```


### `routeRedirect()`

*`routeRedirect()` requires that your is wrapped with a [`<RouterProvider>`](#routerprovider) component.*

```tsx
function routeRedirect(
  to:
    | string
    | RouterAction<any>
    | ((request: RouterRequest) => string | RouterAction<any>),
  status = 302,
)
```

Creates a router that when matched, redirects the user to another path.

The path can be specified as a bare string, or as a [`RouterAction`](#routeraction) object with the portions of the new URL that should differ from the matched URL.

#### Examples

Say you have an app with a number of steps, where each step is accessible at `/step/:number`. You'd like to make sure that if the user goes to the `/step` URL directly, they're redirected to `/step/1`.

```tsx
const stepRouter = routeByPattern({
  '/step/:number': req => <Step number={req.params.number} />,
  '/step': routeRedirect(req => req.pathname+'/1')
})
```


## Functions

### `applyAction()`

```tsx
const location = applyAction(request, action, state?)
```

Applies a [`RouterAction`](#routeraction) to an existing [`RouterRequest`](#routerrequest) -- e.g. as returned from [`useRouterRequest()`](#userouterrequest), returning the new location.

This function is used to compute where links will take the user. It supports relative paths (i.e. those starting with `./` and `../`), absolute paths (those starting with `/`), and follows the browser's default behavior for all other paths.


### `createHref()`

```tsx
const href = createHref({ pathname, search, hash })
```

Joins the argument URL components together into a string href.


### `getInitialStateAndResponse()`

```tsx
const [state, response] = await getInitialStateAndResponse(router, href, options?)
```

Returns a promise to an array containing [`RouterState`](#routerstate) and [`RouterResponse`](#routerresponse) objects, containing the complete content and response for the given `href`.

The returned route can be passed to the `initialRoute` option of `useRouter` -- allowing you to server render asynchronous routes with React's `renderToString()` function.

The returned response contains a status code and headers, which allow you to implement server-side HTTP redirects, return friendly 404 messages with the correct status code, and (using custom router functions) to set caching and other custom headers.

#### Options

- `basename` - *optional* - `string`


### `parseAction()`

```tsx
const action = parseAction(href, state?)
```

Takes a string or object `href`, and optionally a `state` object, and returns a [`RouterAction`](#routeraction) object containing the `pathname`, `query`, `search`, `hash` and `state` for the provided inputs. Properties which are not defined in the inputs will be `undefined`.


## Types

Retil Router is built with TypeScript. It exports the following types for public use.

### `RouterState`

The object returned by `useRouter()` and `getInitialStateAndResponse()`. Contains:

- `content` - the current content
- `controller`- a [`RouterController`](#routercontroller), which can be used to navigate programmatically
- `pending` - a boolean that indicates whether a new route is being loaded
- `request` - a [`RouterRequest`] object with details on the currently displayed route

#### `routerState.content`

Contains a React Element that contains your page's content.

The rendered component will suspend if rendering lazy or async content that is still pending, and will throw an error if something goes wrong while loading your request's content.

Typically, you'll want to render the content inside a component that renders any fixed layout (e.g. a navbar), and inside a `<Suspense>` that renders a fallback until any async or lazy routes have loaded.

```tsx
export default function App() {
  const route = useRouter(router)

  return (
    <RouterProvider state={route}>
      <AppLayout>
        <React.Suspense fallback={<AppSpinner />}>
          {route.content}
        </React.Suspense>
      </AppLayout>
    </RouterProvider>
  )
}
```

#### `routerState.pending`

For lazily loaded routes and routes with async content, it may take some time between clicking a link, and the new content becoming available. During this waiting period, `route.pending` will become `true`. This allows you to display an app-wide loading bar for long-loading routes.

#### Examples

This hook is useful for rendering an app-wide loading bar at the top of your page.

```tsx
export default function App() {
  const route = useRouter(router)

  return (
    <RouterProvider state={route}>
      <AppLayout>
        {route.pending && <AppLoadingBar />}
        <React.Suspense fallback={<AppSpinner />}>
          {route.content}
        </React.Suspense>
      </AppLayout>
    </RouterProvider>
  )
}
```

### `RouterAction`

An object used to represent a change (or *delta*) from the current path. `undefined` values represent no change from the current value.

```tsx
interface RouterAction {
  hash?: string
  pathname?: string
  query?: { [key: string]: string | string[] }
  search?: string
  state?: object
}
```

### `RouterController`

An object providing functions to control the router programmatically.

The promises returned by some functions in this object will resolve once navigation and routing has completed.

```tsx
interface RouterController {
  // Returned boolean indicates whether navigation completed successfully.
  back(): Promise<boolean>

  block(
    // Returns a boolean indicating whether navigation should be blocked.
    blockerFn: (location) => Promise<boolean>
  ): () => void

  // Returned boolean indicates whether navigation completed successfully.
  navigate(
    action: string | RouterAction,
    { replace? } = {}
  ): Promise<boolean>

  prefetch(action): Promise<Route>
}
```


### `RouterFunction`

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

You can then use the `transformRequest` option to [`useRouter`](#userouter) to ensure that the router receives a correctly shaped request.


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
  pendingSuspenses: PromiseLike<any>[]
  status?: number
```
