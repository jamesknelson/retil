# retil-styles

**CSS-in-JS, inside out and upside down.**

## What if?

What if instead of mapping selectors-to-properties-to-values...

```jsx
<button css={{
  borderStyle: 'solid',
  borderColor: 'black',
  ':hover': {
    borderColor: 'red',
  }
}}>
```

You mapped properties-to-selectors-to-values?

```jsx
<Button
  borderStyle='solid',
  borderColor={{
    default: 'black',
    ':hover': 'red',
  }}
/>
```

If your css attributes could accept functions as values, you could even specify colors for all states in a single theme object...

```jsx
<Button
  borderColor={theme => theme.buttons.borderColor}
/>
```

---

And what if instead of tying your pseudo-selectors to individual elements:

```jsx
<button css={{
  ':hover': {
    borderColor: 'red'
  }
}}>
```

You could specified a control boundary, and nested elements would automatically place the `:hover` selector where it makes sense?

```jsx
<ButtonSurface>
  <Icon
    glyph={TranslationsMenu}
    color={{
      default: 'black' 
      hover: 'red',
    }}
  />
  <Caret
    color={{
      default: 'black' 
      hover: 'red',
    }}
  />
</ButtonSurface>
```

It'd allow you to create re-usable components that respond to user interaction – no matter whether that interaction is part of a button, an input, a plain-old div, or even a push-state link:

```jsx
<LinkSurface to='/start'>
  <ButtonBody
    backgroundColor='white'
    borderColor={{
      default: 'black',
      hover: 'gray',
      active: 'darkred',
    }}
    margin='8px 4px'
  }}>
    <ButtonContent
      caret
      glyph={Play}
      label="Play"
      color={{
        default: 'black',
        hover: 'gray',
      }}
    />
  </ButtonBody>
</LinkSurface>
```

How it works
------------

There's three parts to making the above demo work:

- `useHighStyle()`
- `<ProvideDownSelector>`
- and Surface component

This package gives you the `useHighStyle()` hook, and the `<ProvideDownSelector>` provider that allows you to configure custom selectors for your styles like `hover`, `widescreen`. The [retil-interactions](#) package exports the surface components that'll allow you to reuse your interactive styles across multiple packages.


### `useHighStyle`

This hook takes an object of nested style objects, and returns a function that takes "high styles" with custom selectors, and returns the format accepted by your `css` prop -- as supported by [Styled Components](http://styled-components.com/) and [Emotion](https://emotion.sh/docs/introduction).

#### Basic usage

```tsx
import { stringifyTransition, useHighStyle } from 'retil-style'

const directionAngles = {
  down: '0deg',
  up: '180deg',
  left: '-90deg',
  right: '90deg',
}

export const Caret = forwardRef((props, ref) => {
  const {
    color = 'currentColor',
    direction = 'down',
    transition,
    width = 5,
    ...rest
  } = props
  const [styleProps, passthroughProps] = pickAndOmit(rest, layout)
  const highStyle = useHighStyle()

  return (
    <div 
      {...passthrough}
      ref={ref}
      css={highStyle({
        borderTopColor: color,
        borderWidth: width,
        marginBottom: -width,
        borderColor: 'transparent',
        borderStyle: 'solid',
        height: 0,
        width: 0,
        transform: `rotate(${directionAngles[value]})`,
        ...styleProps,
        transition: stringifyTransition(transition, {
          defaults: {
            duration: 200,
            timing: timings.easeOut
          },
          properties: {
            color: ['borderTopColor']
            width: ['borderWidth', 'marginBottom']
            direction: ['transform']
          }
        })
      })}
    />
  )
})
```


Thoughts on styling
-------------------


### Prefer composition over combination

Try and make your components do *one*. For example, the caret example above draws a caret. That's it. Notably, it *doesn't* allow you to transform it – because that can be achieved by wrapping it in a separate box. It also doesn't allow you to apply padding, or otherwise modify any styles outside of those that are used to lay it out within its parent.


### External vs internal styles

external styles are things that can be applied directly to a container without
affecting its internals, other how they adjust to size. these include things
like:

- position
- flex-basis
- flex-grow
- margin
- width
- height
- etc.

internal styles are everything else, including

- padding
- colors
- fonts

External styles can be set on basically anything via standard css/sx props.
They don't need special props, although it doesn't hurt to provide them
for typing purposes. Alternatively, external styles could be applied directly
via css template strings, with a linter to check that they're being applied
correctly.

Internal styles on non-styled components can only be adjusted via props.


### `display` props

When a component is able to be used in both block/inline layouts, it should
expose a boolean `inline` prop that switches between the two. `display` is not
an external style, as the consumer component shouldn't need to know whether to
apply `block` or `flex`, `inline` or `inline-flex`, etc.

Additionally, instead of hiding via `display: none`, you'll want to hide
components by wrapping them in another component that is tasked with hiding
them, preferring composition over combination.


## Fixed dimensions

Some components require fixed dimensions. In this case, they should require one
or mores prop where the developer sets those fixed dimensions, ensuring that
it's immediately obvious to the developer how the component will behave in its
parent layout. The props can either be named `width` and/or `height` when they
only fix a single dimension, or `size` when the component will be square.
The dimensions can be strings naming one of various options, or the string
'fixed' to use the computed value.


License
-------

MIT licensed.
