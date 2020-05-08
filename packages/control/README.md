`@retil/control`
================

Create styled buttons and link components with standard CSS -- including `:hover`, `:focus`, etc. -- *without* coupling your styles to the underlying `<button>` or `<a>` tags.

*This package currently assumes that you're using [Styled Components](https://styled-components.com/). Want to add Emotion support? [Please file an issue!](https://github.com/jamesknelson/retil)*


Installation
------------

```bash
npm install -s @retil/control

# or

yarn add @retil/control
```


Basic Usage
-----------

There's two parts to using `@retil/control`:

1. Create a styled component to render the control's styles
2. Add behavior by wrapping it with a control component


### 1. Create a styled component

You have two options for styling your control: you can use CSS template strings, or style objects with nested selectors.

#### with template strings

```js
import { active, focus, hover } from '@retil/control'

const ButtonBody = ({ children, ...rest ) => (
  <span {...rest} css={css`
    background-color: palevioletred;
    border: 1px solid palevioletred;
    border-radius: 5px;
    color: white;
    margin: 5px;

    ${active`
      transform: scale(0.99);
    `}

    ${focus`
      outline: 1px solid deepskyblue;
    `}

    ${hover`
      background-color: transparent;
      color: palevioletred;
    `}
  `}>
    {children}
  </span>
)
```

#### with objects with nested selectors

TODO

<!--
```js
import { controlStyles } from '@retil/control'

const ButtonBody = ({ children, ...rest ) => (
  <span {...rest} css={controlStyles({
    backgroundColor: {
      default: 'palevioletred',
      hover: 'transparent',
    },
    border: '1px solid palevioletred',
    borderRadius: 5,
    color: {
      default: 'white',
      hover: 'palevioletred',
    },
    margin: 5,
    outline: {
      focus: '1px solid deepskyblue',
    },
    transform: {
      active: 'scale(0.99)',
    }
  })}>
    {children}
  </span>
)
```
-->


### 2. Add behavior with a Control Component

```js
import { AControl } from '@retil/control'

export const App = () => (
  <AControl href='/'>
    <ButtonBody>
      Home
    </ButtonBody>
  </AControl>
)
```


Full API
--------

### Control components

These components accept the same properties as the underlying element with the same name, but render without any default styles.

Control components exported by `@retil/control` include:

- `<AControl>`
- `<ButtonControl>`

<!--

Link controls for popular routers are exported by separate modules:

- `<LinkControl>` <small>(@retil/control/navi)</small>
- `<LinkControl>` <small>(@retil/control/next)</small>
- `<LinkControl>` <small>(@retil/control/react-router)</small>

-->

#### Props

All components accept the following props, in addition to the props accepted by the underlying component:

- `active` (`boolean`)
- `disabled` (`boolean`)
- `focus` (`boolean`)
- `hover` (`boolean`)
- `inline` (`boolean`)

#### Styles

All components render as `display: flex` by default. They can be switched to `display: inline-flex` by passing an `inline` prop.

Components also have the following flexbox styles applied by default -- these can be changed via `className`, `css` or `style` prop.

```css
flex-direction: column;

align-items: stretch;
justify-content: stretch;
```


#### Custom controls with the higher order `control()` function

To create your own custom Control component, you'll first need a Styled Component (as returned directly from the Style Components `styled()` function). Then, you can turn it into a control component by wrapping it with `control`.

Here's an example -- this is the exact code used to create the `ButtonControl` component exported by `@retil/control`

```js
import styled from 'styled-components'
import { control, resetButtonCSS } from '@retil/control'

export const ButtonControl = control(
  styled.button`
    ${resetButtonCSS}
  `,
)
```

The `control()` function also accepts a function as a second argument, which lets you define the selectors which will be made available to child components. Use this to override the default `active`, `disabled`, `focus` and `hover` selectors -- or to provide custom selectors of your own.

```typescript
const StyledButtonControl = styled.button`
  ${resetButtonCSS}
`

// Default behavior
export const ButtonControl = control(
  StyledButtonControl,
  (selectorName: string) => `${Component}:${selectorName}`
)
```


### Template helpers

The following template strings allow can be interpolated within a styled component's css to add styled which respond to events on the control itself.

- `active\`\``
- `disabled\`\``
- `focus\`\``
- `hover\`\``

Example usage:

```js
import { hover } from '@retil/control'

const ButtonBody = styled.span`
  opacity: 1;
  transition: opacity 100ms ease-out;
  
  ${hover`
    opacity: 0.9;
  `}
`
```

#### Custom template helpers with `createTemplateHelper()`

If you've added your own custom selectors by passing a second argument to `control()`, you may also want to create your own custom template helpers.

```js
import { createTemplateHelper } from '@retil/control'

const hover = createTemplateHelper('hover')
```

<!--

### The `controlSx()` function

This function takes an object mapping CSS properties-to-named-selectors-to-values, and returns a function that can be passed to a Styled Components `css` prop.

For example:

```js
controlStyles({
  backgroundColor: {
    default: 'red',
    hover: 'white',
  },
  color: {
    default: 'white',
    hover: 'red',
  }
})

// returns 

(theme) => ({
  backgroundColor: 'red',
  color: 'white',
  '.parent:hover &': {
    backgroundColor: 'white',
    color: 'red',
  }
})
```

It also supports the more standard selectors-to-properties-to-values format, but you'll need to pass your selectors under a `selectors` object to prevent naming conflicts with CSS properties. For example:

```js
controlStyles({
  backgroundColor: 'red',
  color: 'white',
  selectors: {
    hover: {
      backgroundColor: 'white',
      color: 'red',
    }
  }
})
```

Naturally, both formats can be combined.

-->


### `useControlContext()`

Returns the control context, which is internally stored on the `retilControl` prop of the styled components theme.

It has the following shape:

```typescript
export interface Control {
  // Returns a selector which can be interpolated into styles. The default
  // controls support `active`, `focus` and `hover` selectors, but this can
  // be configured by creating custom controls.
  getSelector: (name: string) => string

  active?: boolean
  disabled?: boolean
  focus?: boolean
  hover?: boolean
}
```


### Types

The following TypeScript types are exported:

- `AControlProps`
- `ButtonControlsProps`
- `Control`


### CSS reset strings

The CSS strings used to reset the default styles on `<a>` and `<button>` are exported for your convenience:

```js
import {
  resetACSS,
  resetButtonCSS,
} from '@retil/control`
```


License
-------

MIT licensed.
