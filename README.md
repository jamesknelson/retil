retil
=====

**The React Utility Library**

- Declaratively fetch and subscribe to *any* data source -- whether GraphQL, REST, Firebase, or homing pigeon.
- Designed for SSR, Suspense and Concurrent Mode.
- Includes a normalized cache, so data is always up to date.
- Simplify your app's structure with independent resource files.
- Powerful tooling via integration with redux-devtools.

```bash
yarn add retil
```

## Examples

See a full example in this repository's [./demo](demo) directory.

### Fetch data with Suspense

Thanks to Suspense, your component data will be transparently fetched as required.

```js
import { createDocumentResource, useResource } from 'retil'

const BaseURL = "https://jsonplaceholder.typicode.com"

const posts = createDocumentResource(id => BaseURL+"/posts/"+id)

export function App() {
  // `useResource()` returns an array with two items -- just like `useState()`
  const [state, controller] = useResource(posts, 1)

  // You can find out a bunch of things about the key's current state
  const { hasData, hasRejection, invalidated, pending, primed } = state

  // But if you access the `data` property and the data hasn't yet been fetched,
  // your component will suspend.
  const data = state.data
    
  // If you know the data is out of date and needs to be reloaded, you can let
  // Retil know via the controller's `invalidate()` function
  const refresh = () => controller.invalidate()

  return (
    <>
      <h1>{data.title}</h1>
      <button onClick={refresh}>
        {pending ? "Refreshing..." : "Refresh"}
      </button>
      {data.body.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
    </>
  )
}
```

### Query Resources and the Normalized Cache

Say that you want to display comments and user info along with your posts. You can request this information from the [JSON Placeholder](https://jsonplaceholder.typicode.com/) API used above by adding a couple query parameters to the URL:

https://jsonplaceholder.typicode.com/posts/1?_expand=user&_embed=comments

In simple apps, it may suffice to just switch this URL into the previous example and call it a day. But in larger apps, this is less than ideal. *What if the user updates their name?* Given that the received *user* object is inlined into the *post* object, if the user updates their name then the info stored with the post will become **stale**.

To fix this, each type of resource needs to stored together, and then linked together. It needs to be **normalized.** And Retil makes this easy, using *query resources*.

```ts
import {
  createDocumentResource,
  createQueryResource,
  embed,
  list,
  useResource
} from 'retil'

const BaseURL = "https://jsonplaceholder.typicode.com"

export const comment = createDocumentResource()
export const post = createDocumentResource()
export const user = createDocumentResource()

export const postQuery = createQueryResource({
  for: embed(post, {
    user,
    comments: list(comment)
  }),
  load: (postId: string) =>
    BaseURL + `/posts/${postId}?_expand=user&_embed=comments`,
})
```

This tells Retil that the data received for `postQuery` should be stored independently as comments, posts and users, and then recombined at runtime. Importantly, you can use the same documents across multiple queries -- ensuring that all queries share the same document data.

```js
export const postsQuery = createQueryResource({
  for: list(posts),
  load: () => BaseURL + `/posts`,
})
```

Within your components, you can use query resources in exactly the same manner as you'd use document resources:

```js
export function App() {
  const [state] = useResource(postQuery, 1)
  const data = state.data

  return (
    <>
      <h1>{data.title}</h1>
      <p>
        By <strong>{data.user.name}</strong>
      </p>
      {data.body.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
      <h2>Comments</h2>
      {data.comments.map(comment => (
        <div key={comment.id}>
          <h3>{comment.name}</h3>
          <p>{comment.body}</p>
        </div>
      ))}
    </>
  )
}
```