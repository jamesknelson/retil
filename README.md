retil
=====

**The React Utility Library**

- Designed for SSR, Suspense and Concurrent Mode.
- Simplify your app's structure with independent Model files.
- Powerful tooling via integration with redux-devtools.
- Transform data sources with Suspense-aware `map`, `filter`, `fallback`, `last` and `combine` functions.
- Declaratively fetch and subscribe to *any* data source.

```bash
yarn add retil
```

## Examples

### Fetch data with Suspense

Thanks to Suspense, Retil's resource models can transparently fetch data as required.

```js
import { createResourceModel, useSubscription } from 'retil'

const resource = createResourceModel()

export function App() {
  // resource.key() returns a subscription, and a controller.
  const [subscription, controller] = resource.key('/my/api/url')

  // To get the key's latest state, just pass the subscription to
  // `useSubscription` -- a hook maintained by the React team itself.
  const state = useSubscription(subscription)

  // You can find out a bunch of things about the key's current state
  const { hasData, hasRejection, invalidated, pending, primed } = state

  // If you access `state.data` or `state.rejection` before the data has loaded,
  // Retil will automatically fetch the data -- suspending the component until
  // the data is available.
  const data = value.data
    
  // If you know the data is out of date and needs to be reloaded, you can let
  // Retil know via the key's controller
  const handleSomething = () => controller.invalidate()

  // And that's about everything you need to know to fetch data with concurrent
  // React!
  return (
    <button onClick={handleSomething}>
      {data}
    </button>
  )
}
```

### Configuring authentication and headers

```js
import { useMemo } from 'react'

const resourceModel = createResourceModel()

export function App({ headers }) {
  // Memoize the options, so that a new resource doesn't need to be created on
  // each render.
  const fetchOptions = useMemo(
    () => ({ headers },
    [headers]
  )

  // If you pass an object containing `fetchOptions`, then these options will be
  // passed to `window.fetch` -- allowing you to configure authentication, etc.
  const [subscription] = resourceModel({ fetchOptions }).key('/my/api/url')

  const state = useSubscription(subscription)
}
```

### `map()`, `fallback()`, and usage without Suspense

```js
const resource = createResourceModel()

export function App() {
  const [subscription] = resource.key('/my/api/url')

  const subscriptionDataWithFallback = useMemo(() =>
    subscription
      // The subscription's `map` function understands Suspense -- even if
      // your version of React doesn't.
      .map(state => state.data || state.rejection)
      // Then just set a fallback value if you don't want React to suspend.
      .fallback('loading'),
    [subscription]
  )
  
  const data = useSubscription(subscriptionDataWithFallback)
}
```

### Avoiding waterfalls, part 1 -- the `combine()` function

Say you need to fetch data from *two* URLs. Since Retil only starts fetching data when you access the `data` property, and accessing the `data` property Suspends the component until the first request is complete, you have a problem.

**TODO: diagram.**

If we need to fetch data for multiple keys, the fetches will happen in *series*. Ideally though, they should happen *concurrently*.

**TODO: diagram.**

Retil provides two ways to solve this: the `combine()` function, and imperative preloading. But let's start with `combine()`.

The `combine()` function accepts an object of subscriptions, and returns a subscription to the values of *all* of those subscriptions. Crucially, `combine()` makes sure that all of the values are fetched concurrently -- even if some of those values suspend.

```js
import { combine } from 'retil'

const privateResource = createResourceModel()
const publicResource = createResourceModel()

export function App() {
  const [accountSub] = privateResource({ fetchOptions }).key('/account')
  const [contentSub] = publicResource.key('/content')

  const dataSub = useMemo(() =>
    combine({
      account: accountSub.map(state => state.data),
      content: contentSub.map(state => state.data),
    }),
    [accountSub, contentSub]
  )

  const { account, content } = useSubscription(dataSub)
  
  // ...
}
```

### Avoiding waterfalls, part 2 -- the `load()` method

While `combine()` let's you avoid waterfalls within a single component, it doesn't help when your Suspense waterfalls span *multiple* components. To avoid waterfalls in this scenario, you'll need to manually tell Retil to start loading your data *before* the first component suspends. And to do that, you can use the `load()` method.

Generally, the best place to call `load()` functions is within your routes. For example, in a Next.js app, you'd call it in `getInitialProps()`, or in a Navi app you'd call it within your `route()` functions. For this example though, let's keep things simple and just add a listener using react-router's `history` object:

```js
// TODO
```

### Server-Side Rendering (SSR)

```js
/**
 * index.js
 */

import { createStore } from 'retil'
import { App } from './App'

// The store holds your model states, and by default, will preload any state
// that you've made available on window.RetilPreloadedState
const store = createStore(window.RetilPreloadedState)

ReactDOM.createRoot(rootNode).render(<App store={store} />);

/**
 * App.js
 */

import { ModelContext } from './Model'
import { Page } from './Page'

export function App({ store }) {
  return (
    <ModelContext.Provider value={{ store }}>
      <Page />
    </ModelContext.Provider>
  )
}

/**
 * Model.js
 */

import { createContext, useContext } from 'react'

export const resourceModel = createResourceModel({
  // The store is shared by all your app's models, so you'll need to give the
  // model a unique string to identify it.
  namespace: 'api',
})

export const ModelContext = createContext()

export const useModel = (model) => model(useContext(ModelContext))


/**
 * Page.js
 */

import { resourceModel, useModel } from './Model'

function Page() {
  // The useModel hook will configure the model to use your app's store, and
  // any other supplied context (e.g. fetchOptions)
  const resource = useModel(resourceModel)

  // Then just use the resource as before!
  const [subscription, controller] = resource.key('/my/api/url')
  const state = useSubscription(subscription)

  // ...
}

/**
 * server.js
 */

import { renderToString } from 'react-dom/server'
import { App } from './App'
import { resourceModel } from './Model'

async function renderApp(req) {
  const store = createStore()

  try {
    // Imperatively load the required data based on the request. You'll probably
    // want some help from a routing tool, e.g. Next's `getInitialProps()`.
    if (req.url === '/something') {
      const resource = resourceModel({ store })
      const [subscription, controller] = resource.key('/my/api/url')
      controller.load()
    }

    // Then call `store.dehydrate()` and wait for the loads to complete. This
    // will return a serializable object to put on `window.RetilPreloadedState`.
    const preloadedState = await store.dehydrate()

    // Finally, render your app. Given the store has been hydrated with the
    // required data, the should render in a single pass -- without suspending.
    return {
      appHTML: renderToString(<App />),
      preloadedState,
    }
  }
  finally {
    // Make sure to free up memory once the request is complete!
    store.dispose()
  }
}
```

### Custom resource loaders and invalidators

```js
import {
  createInvalidator,
  createURLLoader,
  createResourceModel
} from 'retil'

const resource = createResourceModel({
  // createURLLoader is the default, but custom loaders let you fetch your
  // data from anywhere.
  loader: createURLLoader({

    // Defaults to window.fetch, but you can supply your own fetch function.
    fetch: window.fetch,

    // Add auth tokens, content type headers, or anything else.
    getRequest: ({ context, key }) => ({
      url: key,
      ...context.fetchOptions,
    })

    // If you need to apply any fancy transformations to the response, then
    // you can do them here.
    getData: async (response) => {
      return await response.json()
    }
  }),

  // Custom invalidators let you decide when data should be re-loaded.
  invalidator: createInvalidator({
    // In this case, we'll reload it every 60 seconds.
    intervalFromTimestamp: 60 * 1000,
  })
  
  // You can also configure subscriptions, effects, non-string keys,
  // storage scoped by context, and a whole lot more.
})
```

### Other models types

Not all asynchronous state fits the Resource paradigm. For example, many apps need to model authentication and user preferences. Retil facilitates this with a number of lower-level models types, including:

- Reducer
- State
- Queue

**TODO: docs for other model types.*