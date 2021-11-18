# retil-transition

Exports a `<ColumnTransition>` component which can be used to a render column of content which transitions smoothly from one child to the next.

The component will ensure that during the exit transition, the previously active element takes a constant size based on the last size while it was active.

## Usage

You can treat your `ColumnTransition` as a flexbox column that accepts arbitrary content. 

Whenever its `transitionKey` prop changes, the content will be transitioned out, and the new content transitioned in. If no `transitionKey` is supplied, the `children` prop will be used as the key.

```jsx
import { ColumnTransition } from 'retil-transition'

function App() {
  const { path, content } = useRouter()

  return (
    <ColumnTransition
      className='main-content'
      transitionKey={path}>
      {content}
    </ColumnTransition>
  )
}
```

### Configuration transition styles

You can configue the appearance of the transition by supplying an object to the `transitionConfig` prop, with the following keys:

- `initial`
- `from`
- `enter`
- `exit`

Internally, transitions use react-spring, so the `transitionConfig` object supports any [configuration](https://react-spring.io/common/configs) that react-spring does.

#### Example

```tsx
import type { TransitionConfig } from 'retil-transition'

// These settings are handled by react-spring
const crossfadeSpringConfig = {
  mass: 5,
  tension: 50,
  friction: 10,
  clamp: true,
}

const crossfadeTransitionConfig: TransitionConfig = {
  initial: {
    opacity: 0,
  },
  from: {
    opacity: 0,
  },
  enter: {
    opacity: 1,
    config: crossfadeSpringConfig,
  },
  exit: {
    opacity: 0,
    config: crossfadeSpringConfig,
  },
}


function App() {
  const { path, content } = useRouter()

  return (
    <ColumnTransition
      className='main-content'
      transitionConfig={crossfadeTransitionConfig}
      transitionKey={path}>
      {content}
    </ColumnTransition>
  )
}
```

### Transition Handles

Items rendered within a `<ColumnTransition>` may opt to render their own transition in and out via the `useTransitionHandleRefContext()` hook.

This hook returns a ref whose current value can be set to a `TransitionHandle` object, whose methods will then be called to hide/show the item *instead of* applying the transition specified by the `transitionConfig` prop.

```tsx
interface TransitionHandle {
  show: () => Promise<void>
  hide: () => Promise<void>
}
```
