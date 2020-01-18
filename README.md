retil
=====

**A collection of simple utilities for React**

```bash
yarn add retil
```

## Examples

### Simple usage

```js
import { createResourceModel, useSubscription } from 'retil'

const resource = createResourceModel()

export function App() {
  // Get a subscription to pass to React's useSubscription hook
  const [subscription] = resource.key('/my/api/url')

  // Accessing the `data` property will suspend until the data is available.
  const { data } = useSubscription(subscription)
}
```

### Simple usage, *without* Suspense

```js
import { createResourceModel, useSubscription } from 'retil'

const resource = createResourceModel()

export function App() {
  const [subscription] = resource.key('/my/api/url')

  const subscriptionDataWithFallback = useMemo(() =>
    subscription
      // The subscription's `map` function understands Suspense -- even if
      // your version of React doesn't. You can accessing suspended data
      // with impunity!
      .map(({ data }) => data))
      // Then just remember to set a fallback value if you don't want React
      // to suspend.
      .fallback('default value'),
    [subscription]
  )
  
  const data = useSubscription(subscriptionDataWithFallback)
}
```

### SSR

```js
/**
 * App
 */

import {
  Provider,
  createStore
} from 'retil'

// The store holds your model states, and by default, will preload any state
// that you've made available on window.RetilPreloadedState
const store = createStore(window.RetilPreloadedState)

function App() {
  return (
    <Provider value={{ store }}>
      <Page />
    </Provider>
  )
}

/**
 * Page
 */

import {
  createResourceModel,
  useModel,
  useSubscription
} from 'retil'

const resourceModel = createResourceModel({
  // The store is shared by all your app's models, so you'll need to give the
  // model a unique string to identify it.
  namespace: 'api',
})

function Page() {
  // The useModel hook will configure the model to use your app's store.
  const resource = useModel(resourceModel)

  // Then just use the resource as before!
  const [subscription] = resource.key('/my/api/url')
  const resource = useSubscription(subscription)
}

/**
 * Server
 */

const store = createStore()

// Outside of your components, you can get a model instance by passing the
// context to it directly
const resource = resourceModel({ store })

const [subscription, controller] = resource.key('/my/api/url')

// You can imperatively start loading a resource key's data. You'll probably
// want to do this within your router, e.g. in Next's `getInitialProps()`
controller.load()

// Then once your content is loaded, `store.dehydrate()` will give you the
// serializable state to put on `window.RetilPreloadedState`
const preloadedState = await store.dehydrate()

// Make sure to free up the memory once the request is complete!
store.dispose()
```

### Custom loaders and invalidators

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
  
  // You can also configure subscriptions, effects, and a whole lot more.
})
```