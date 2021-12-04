# retil-nav-scheme

Link and route your app with a well-typed, refactorable URL scheme.

## Usage

### `createScheme(urlFunction)`

Define your URL scheme in separate files adjacent to your routes. This allows URLs to be imported and referenced without needing to load the full route content.

### `nestScheme(urlFunction, scheme): nestedNavScheme`

Nests a scheme underneath a url, possibly including paremeters. Returns a nested scheme object, which can be passed to a key in a `scheme()` call.

### `patternFor(schemeNode)`

Returns a routing pattern for a specific scheme entry. The pattern is compatible with retil-nav, and all other [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) based routing libraries.

## Example

```ts
/**
 * appURLs.ts
 */

import { createScheme, nestScheme } from 'retil-nav-scheme'
import { encode as encodeBase58UUID } from 'uuid-base58'

import { PostParams, PostQuery } from './post/postURLs'
import profileURLs, { ProfileParams } from './profile/profileURLs'

export default createScheme({
  top: () =>  '/',

  post: ({
    userHandle,
    postId,
    ...query
  }: PostParams & PostQuery) => ({
    query: { ...query },
    pathname: `/@${userHandle}/${encodeBase58UUID(postId)}`,
  }),

  login: () => `/login`,
  logout: () => `/logout`,

  profile: nestScheme(
    (profileParams: ProfileParams) => `/@${profileParams.userHandle}`,
    profileURLs,
  ),
})
```

```ts
/**
 * appLoader.ts
 */

import { loadLazy } from 'retil-mount'
import { loadMatch } from 'retil-nav'
import { patternFor } from 'retil-nav-scheme'

import urls from './appURLs'

export default loadMatch<AppEnv>({
  [patternFor(urls.top)]: loadLazy(() => import('./front/frontLoader')),
  [patternFor(urls.post)]: loadLazy(() => import('./post/postLoader')),
  [patternFor(urls.login)]: loadLazy(() => import('./login/loginLoader')),
  [patternFor(urls.logout)]: loadLazy(() => import('./logout/logoutLoader')),
  [patternFor(urls.profile)]: loadLazy(() => import('./profile/profileLoader')),
})
```

```ts
/**
 * profileURLs.ts
 */

import { createScheme } from 'retil-nav-scheme'

export type ProfileParams = {
  userHandle: string
}

export default createScheme({
  top: () => `/`,
  replies: () => `/replies`,
})
```

```ts
/**
 * profileLoader.ts
 */

import { loadMatch } from 'retil-nav'
import { patternFor } from 'retil-nav-scheme'

import urls from './profileURLs'

export default loadMatch<AppEnv>({
  [patternFor(urls.top)]: loadLazy(() => import('./profileLoader')),
  [patternFor(urls.replies)]: loadLazy(() => import('./profileRepliesLoader')),
})
```