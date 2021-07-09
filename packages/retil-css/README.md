# retil-css

**Superpowers for decoupling style from behavior.**


✅ Works with [Styled Components](https://styled-components.com/) and [Emotion](https://emotion.sh/)
✅ SSR friendly
✅ Built for Concurrent React
✅ You'll wonder how you ever lived without it


### Surface Selectors

Gone are the days where you'd need to create different variations of your styles for links, buttons, submit buttons, any any other kind of behavior you came across.

With retil-css, now you simply create re-usable **style components** that can be rendered inside *any* **surface component**.

```jsx
const inFocusedSurface = createSurfaceSelector(':focus')

const ButtonStyle = ({ children, color = 'red' }) => (
  <div css={css`
    background-color: ${color};
    border-radius: 4px;
    color: white;

    ${inFocusSurface} {
      box-shadow: 0 0 0 2px blue;
    }
  `}>
    {children}
  </div>
)

render(
  <>
    <ButtonSurface>
      <ButtonStyle>
        I'm a button!
      </ButtonStyle>
    </ButtonSurface>
    <LinkSurface>
      <ButtonStyle>
        I'm a link that looks like a button!
      </ButtonStyle>
    </LinkSurface>
  </>
)
```


### Custom Surface Selectors

With retil-css, you're no longer limited to the CSS selectors that the internet gods deigned fit to include in the browsers of yore. Because with custom selectors, you can create any behavior-based CSS selector that you can imagine!

For example, custom selectors allow you to create components whose styles vary when mounted in a link to the currently active page –– using the <ConnectSurface> component.

```jsx
const inLocalLinkSurface = createSurfaceSelector(':local-link')

const LinkSurface = ({ href, ...rest }) => {
  // Return true if the given href matches the current URL
  const active = useNavMatch(href)
  const linkProps = useNavLinkProps(href)

  return (
    <ConnectSurface
      mergeProps={{ ...rest, ...linkProps }}
      overrideSelectors={[
        [inLocalLinkSurface, active]
      ]}
    >
      {props => <a {...props} />}
    </ConnectSurface>
  )
}
```

Now that you have a `<LinkSurface>` component and `inLocalLink` selector, you can use them just like the in-built surfaces and selectors!

```jsx
const NavLinkStyle = ({ children }) => (
  <div css={css`
    ${inLocalLinkSurface} {
      border-bottom: 2px solid gray;
    }
  `}>
    {children}
  </div>
)

render(
  <LinkSurface>
    <NavLinkStyle>
      I'm a link that looks like a button!
    </NavLinkStyle>
  </LinkSurface>
)
```


## Media Queries 

Naturally, media queries are also supported anywhere that a surface selector can be used.

```jsx
const inSmallMedia = createMediaQuery('(max-width: 767px)')

const ButtonStyle = ({ children }) => (
  <div css={css`
    font-size: 16px;

    ${media.small`
      font-size: 14px;
    `}
  `}>
    {children}
  </div>
)
```


### Overriding Media Queries

Have you ever built a responsive component that's perfect for mobile, perfect for desktop, and looks *terrible* if you try and and shrink it to mobile size *within* your desktop layout?

Sure, this may sound suspiciously specific – but it may also sound like that list of mobile-width cards you never built because you knew it was going to be a pain-in-the-arse.

But anyway, I guess what I'm trying to say is that retil-css lets you enable or disable media query styles, with the `<ProvideMediaQueries>` component.

```jsx
<ProvideMediaQueries enable={[inSmallMedia]} disable={[inLargeMedia]}>
  <ButtonStyle>
    I'm rendered like I'm in small media!
  </ButtonStyle>
</ProvideMediaQueries>
```



### High Style

Re-usable style components free you up to create high-quality component libraries and design systems, and retil-css facilitates this too with **high style** – style objects that allow for different values in different surfaces.

```jsx
const inHoveredSurface = createSurfaceSelector(':hover')

<div css={css({
  color: {
    default: 'black',
    [inHoveredSurface]: 'red',
    [inLocalLink]: 'black',
  },
  fontSize: {
    default: '16px',
    [inSmallMedia]: '14px',
  }
})} />
```


### Hydration-aware media hooks

Sometimes CSS-based media queries just aren't enough. Sometimes you want to render *different components* for different devices.

```
const small = useMediaQuery(inSmallMedia)

render(
  small
    ? <SmallNav>
    : <LargeNav>
)
```

The problem with this, of course, is that *the server doesn't have a screen size*. You media queries won't work on SSR, which leaves you with *three* choices:

1. Rendering a single component, defaulting to *probably* the wrong one, and fixing it after hydration with a flash-of-incorrect-content.
2. Render *both* components, hiding one with a CSS-based media query, but still using twice the memory.
3. Use retil-css' *hydration-aware media renderer hook* to render both components during SSR, and then remove the unnecessary one after hydration.

```jsx
const App = () => {
  const renderWhenLarge = useMediaRenderer(defaultMediaQueries.large)
  const renderWhenSmall = useMediaRenderer(defaultMediaQueries.small)

  return (
    <>
      {renderWhenLarge((hideCSS) => (
        <div css={hideCSS}>Large</div>
      ))}
      {renderWhenSmall((hideCSS) => (
        <div css={hideCSS}>Small</div>
      ))}
    </>
  )
}
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
