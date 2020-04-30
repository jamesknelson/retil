# `@retil/source`

Takes data from asynchronous sources, and converts it to a Suspense-capable `Source` object that can be easily consumed by your React components.

```bash
npm install --save @retil/source
```

## An example: Firebase and Suspense

Imagine that you've got a *subscription function* -- a function that accepts a `next()` callback, and calls it with each new value. Firebase's `onSnapshot` is a good example:

```tsx
const songsRef = firebase.firestore().collection('songs')
songsRef.onSnapshot(nextSnapshot => {
  // this function is called for each new value received from the server
})
```

Let's say you've got a `<SongsView>` component that takes one of these snapshots and renders it for you. How would you actually pass the latest snapshot to its `snapshot` prop? And how would you render a loading indicator while the initial snapshot is still loading?

```tsx
import { createSource, useSource } from '@retil/source'
import React, { Suspense } from 'react'

const songsRef = firebase.firestore().collection('songs')

// When you pass a subscribe function like Firebase's `onSnapshot` to
// `createSource`, it'll return a `Source` object that tracks the latest
// value.
const songsSnapshotSource = createSource(songsRef.onSnapshot)

function Songs() {
  // Source objects can be consumed with the `useSource` hook. The value 
  // returned by this hook reflects the latest value output by the source's
  // underlying subscribe function. And if there hasn't yet been any value –
  // for example, because they're still being fetched – then `useSource` will
  // suspend until the first value is available.
  const songsSnapshot = useSource(songsSnapshotSource)

  return <SongsView snapshot={songsSnapshot} />
}

function App() {
  return (
    <Suspense fallback="Loading...">
      <Songs />
    </Suspense>
  )
}
```

## What is a source?

Sources are objects that provide access to some value that changes with time. 
I like to think of this as keeping track of the **answer to a question**. For example, in the Firebase example above, the source keeps track of the answer to the question *what is currently stored in the Firebase "songs" collection?*

```typescript
// Returns the current value
const value = songsSnapshotSource.getCurrentValue()

// Calls the supplied callback whenever the value that would be returned by
// `getCurrentValue()` has changed.
songsSnapshotSource.subscribe(() => {
  console.log('new songs snapshot', songsSnapshotSource.getCurrentValue())
})
```

In addition to keeping track of the answer to a question, sources also keep track of two more important pieces of information *about* that question and answer:

1. whether we currently have an answer at all (i.e. do we have a value?)
2. has something gone wrong that prevents us from answering that question (i.e. do we have an error?)







## `Source` objects

TODO: what is a source object

```typescript
export interface Source<T> {
  getCurrentValue(): T
  getValue(): Promise<T>
  hasCurrentValue(): boolean
  subscribe(callback: () => void): () => void

  fallback(value: T): Source<T>
  filter(predicate: (value: T) => boolean): Source<T>
  last(): Source<T>
  map<U>(mapFn: (value: T) => U): Source<U>
}
```

## Creating source objects

### Subscribe functions

- sources are created lazily; the subscribe function won't be called until
  needed, and the subscription will be cancelled when no longer needed

TODO

### Source descriptors

TODO

### Async generators

TODO


Utilities for creating and manipulating data sources, using reactive programming principles.

Rules of sources:

- subscribe only notifies its listeners when a value changes; the listeners
  will never be called if the value returned by `getCurrentValue()` has not
  changed from the previous value passed to that listener.
- it's possible that multiple values of "getCurrentValue()" can occur in a
  single tick/list of synchronously executed microtasks. in this case, some
  values may be skipped, but the final value will always cause a
  notification (unless the final value reverts back to the previous notified
  value).
- in the case of an error, `getCurrentValue()` should throw the error. when
  the source enters or leaves an error state, the subscribers should be
  notified. the behavior for what happens when moving between error states
  is undefined.
- when there is currently no value, the source is said to be in a suspended
  state. in this case, getCurrentValue will throw a void promise which
  resolves once the source has a value (or error) again.
- there is currently no mechanism to check whether the source is unable to
  leave it's current state due to a fatal error or due to the underlying data
  stream having ended. however, when the source itself knows this is the
  case, then the source should unsubscribe any listeners, and any further
  subscribe calls should immediately have their returned unsubscribe function
  be called.