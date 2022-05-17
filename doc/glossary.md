# Glossary

## High Style & Down Selector

When crafting styles, you'll often want to be able to indicate that specific styles should only apply when the user is hovering over an element, pressing it, or interacting with it in some other way. To help with this, CSS furnishes you with pseudo-selectors like ':hover' and ':active'. These even allow you to target interactions on parent elements, which theoretically makes it possible to create composable interactive styles.

...

```jsx
<button className="surface">
  <div css={css`
    .surface:focus & {
      box-shadow: 0 0 0 2px blue;
      border-radius: 3px;
    }
  `}>
    <div css={css`
      .surface:hover & {
        opacity: 0.9;
      }
    `}>
      Press me!
    </div>
  </div>
</button>
```

In the real world though, the problem is that each of these elements will often be rendered by different components. For example, the above markup may be rendered by this React component tree:

```jsx
<ButtonSurface>
  <FocusIndicator>
    <ButtonBody>
      Press me!
    </ButtonBody>
  </FocusIndicator>
</ButtonSurface>
```

While this may work now, it's likely to be a maintainability and readability nightmare due to the fact that each of the inner components depends on the fact that:

1. It is rendered inside a component that renders a <ButtonSurface> and
2. The <ButtonSurface> renders an element with a `.surface` class name.

High Style and Down Selects resolve this situation by adding a function to the app context that "down selects" custom "high selectors" into standard CSS selectors. For example, it can take a "hover" selector, and turn it into ".surface:hover &" – allowing your components to ask for a relevant selector without needing to know the actual CSS ahead of time.



### Surface

An interactive component that renders a single children-containing element, setting up event handlers on the element that give it a specific behavior.

One global behavior for surfaces is that when rendered inside a control, the surface will not receive focus from pointer events, but instead will redirect focus to the control's primary element.


## Control


## Source

An object which *may* hold a current values, and allows you to subscribe to be notified of changes to the value or existence of a value. Sources are designed to work seamlessly and performantly with Concurrent React.

Sources are typically used to represent changing values that aren't managed by React itself. For example:

- The current history and route
- Authentication state
- The position of a popup, as generated from a vanilla JS positioning library

Sources are lazy; if there are no subscribers, they'll not hold any resources. Note that requesting the next value from a source, if there is no current value, then it will internally create a subscription that resolves once a value is available.

Sources are represented in memory as a nested tuple:

```ts
type Source<T, U> = readonly [
  core: readonly [
    get: () => U,
    subscribe: (callback: () => void) => void,
  ],
  select: (core: [get: () => U]) => T,
  act: <U>(callback: () => PromiseLike<U> | U) => Promise<U>
]
```

This structure is designed to allow sources to be used with React's Suspense and useMutableSource:

- The `core` acts as an immutable core, which provides access to the source's state via `get` and `subscribe` functions, and can be passed as the first argument of React's `createMutableSource`
- The `get` function returns the current value if it exists, or throws a promise that will resolve when a value is available – easing integration with Suspense. The `get` function can also serve as a `getVersion` function for `createMutableSource`.
- The `select` function is a plain function that takes the source state and returns the part which the developer actually needs. This function can frequently change, without requiring subscriptions to be created/destroyed.
- The `act` function allows the source's value to be "switched off" for the duration of a callback which may cause frequent changes, giving the developer control over when a source should actually publish it's updates.


## Handle

A `handle` is an object that allows you to control or read data related to a component instance or source. The object itself should never change over the course of that component instance or source existing.


## Service

A service is a pair containing a source and its handle.

```ts
type Service<T, Controller> = readonly [
  source: Source<T>,
  controller: Controller,
]
```


## Configurator

A configurator is a function which takes an initial configuration, and returns a tuple with an immutable value like a service, source or handle, along with a function to *reconfigure* that value.

```ts
type Configurator<Config extends object, Value> = (
  initialConfig: Config,
) => readonly [
  reconfigure: (nextConfig: Config) => void,
  value: Value
]
```

Configurators are useful when you need a service that keeps internal state, but should also be configurable via component props. A `useConfigurator` hook is available that takes a configurator, the current configuration, and returns the immutable value while reconfiguring it in an effect whenever the configuration changes.

```ts
const value = useConfigurator(configurator, config)
```


## <ConnectSomething> Component

```js
<ConnectX
  mergeProps={{}}
  children={props => ReactElement}
>
```

These components at minimum accept:

- a render function
- a `mergeProps` prop

They then merge whatever props they're providing into `mergeProps`, and pass the whole thing through to the render function.


### Why `mergeProps`

By allowing anything to be passed into a separate prop, it becomes possible for the component to connect component itself to receive any props (other than a `mergeProps` prop), and pass them through to the underlying component in a type-safe fashion. It also allows the nesting of multiple connect components. For example:

```jsx
<ConnectX mergeProps={props}>
  {xConnectedProps => (
    <ConnectY mergeProps={xConnectedProps}>
      {xyConnectedProps => <div {...xyConnectedProps} />}
    </ConnectY>
  )}
</ConnectX>
```


### Advantages over merge hooks

It's possible to get values from context and merge values into a props argument all with a custom hook. So why use a full component? There's two main advantages:

-   The component wrap the rendered element with provides, *writing* to context as well as just reading from it

-   A connect component can read contextual values from providers rendered by the same component that renders the connect component itself. For example

    ```jsx
    <SomethingProvider>
      <ConnectX mergeProps={props}>
        {connectedProps => <div {...connectedProps} />}
      </ConnectX>
    </SomethingProvider>
    ```
