<h1 align="center">
  retil-source
</h1>

<h4 align="center">
  Superpowers for React state management
</h4>

<p align="center">
  <a href="https://www.npmjs.com/package/retil-source"><img alt="NPM" src="https://img.shields.io/npm/v/retil-source.svg"></a>
</p>

Create and combine asynchronous data sources that work great with React Concurrent Mode.

## Installation

```bash
# For npm users...
npm install --save retil-source

# For yarn users...
yarn add retil-source
```

## Sources don't always have values

Why should a data source return a value before it has one?

```tsx
import { createState, hasSnapshot } from 'retil'

const [stateSource, setState] = createState()
const [getState, subscribe] = stateSource

getState() // throws a promise that resolves to the first value.

setState('yo!')

getState() // now it returns 'yo!'
```

## Examples

Say you have a source that switches between having a value, and *not* having a value -- e.g. because it maps an id to data on a remote server. But you still want to display the latest value.

```ts
import { Source, fuse } from 'retil'

export const fallbackToMostRecent = <T>(source: Source<T>): Source<T> => {
  let fallback: [T] | [] = []
  return fuse(use => {
    const value = use(source, ...fallback)
    fallback = [value]
    return value
  })
}
```

Maybe as well as remembering the most recent value, you'd also like to set a flag indicating whether the source is missing a current value. To do this, you can `use` your source *twice*, with different fallback values. Don't worry, `fuse` will only subscribe to the source once!

```ts
const missingFlag = Symbol('missing')

export function addBusyFlag<T, U>(
  source: Source<T>,
  build: (snapshot: T, flag: boolean) => U,
): Source<U> {
  let fallback: [T] | [] = []
  return fuse((use) => {
    const value = use(source, ...fallback)
    const valueOrFlag = use(source, missingFlag)
    fallback = [value]
    return build(value, valueOrFlag === missingFlag)
  })
}
```