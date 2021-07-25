# retil-media

**Superpowers for developers building responsive React apps.**


✅ Works with [Styled Components](https://styled-components.com/) and [Emotion](https://emotion.sh/)
✅ SSR friendly
✅ Built for Concurrent React
✅ You'll wonder how you ever lived without it


## Media Selectors

Media selectors give you a powerful and declarative way to work with media queries within your apps.

At their simplest, they're almost self explanatory – just wrap your Emotion or Styled Components tagged `css` template strings to apply the appropriate media selector.

```jsx
import 'retil-cssd-components'
import { createMediaSelector } from 'retil-media'
import { css } from 'styled-components'

const inSmallMedia = createMediaSelector('(max-width: 767px)')

export const ButtonBody = ({ children }) => (
  <div css={css`
    font-size: 16px;

    ${inSmallMedia(css`
      font-size: 14px;
    `)}
  `}>
    {children}
  </div>
)
```

As you can see, the above example exports a <ButtonBody> component with a font-size that adjusts to the size of the screen. Neat, huh? But say that for some reason, you want to render the *small* version of the the button on a *large* screen...


## Overriding Media Selectors

Have you ever built a responsive component that's perfect for mobile, perfect for desktop, and looks *terrible* if you try and and render it inside a mobile-sized container *within* your desktop layout?

Sure, this may sound suspiciously specific – but it may also sound like that list of mobile-width cards you never built because you knew it was going to be a pain-in-the-arse.

But anyway, I guess what I'm trying to say is that retil-media lets you enable or disable media query styles, with the `<ProvideMediaQueries>` component.

```jsx
// import { ProvideMediaSelectors } from 'retil-media'
// const inLargeMedia = createMediaSelector('(min-width: 768px)')

<ProvideMediaSelectors override={{ [inSmallMedia]: true, [inLargeMedia]: false }}>
  <ButtonBody>
    I'm rendered like I'm in small media!
  </ButtonBody>
</ProvideMediaSelectors>
```




## Hydration-aware media hooks

If you're using retil-hydration, then Retil's media selectors *just work* with server rendering and hydration. If you're not, getting started is as adding a single hook to your top-level app component:

```tsx
import { useBoundaryHydrater } from 'retil-hydration'

// This will automatically mark your app as hydrated in an effect. See
// documentation in retil-hydration for details.
useBoundaryHydrater()
```

*Note: if you're using supense or lazily loaded components, then you'll also need to use the retil-boundary's `<Boundary>` component in place of the standard React `<Suspense>`. Read more about this in the retil-boundary documentation.*


### `useMediaSelector`

```ts
function useMediaSelector(selector: MediaSelector): boolean | undefined
```

This does about what you'd select –– so long as it's called in a browser. On the server however (and during client-side hydration), it'll return `undefined` – as there's no media on the server to run the media query against.

This hook will respect any overrides configured by `ProvideMediaSelectors` in *ancestor* components, however, it won't be able to see any overrides rendered within the same component.

---

### Media-conditional rendering

There are times when CSS-based media queries just aren't enough – for example, when you want to render *different components* for different devices.

```tsx
const small = useMediaSelector(inSmallMedia)
return small ? <SmallNav /> : <LargeNav />
```

The problem with this, of course, is that *the server doesn't have a screen size*. You media queries won't work on SSR, which leaves you with *three* choices:

1. Rendering a single component, defaulting to *probably* the wrong one, and fixing it after hydration with a flash-of-incorrect-content.
2. Render *both* components, hiding one with a CSS-based media query, but still using twice the memory.
3. Use retil-css' *hydration-aware media renderer hook* to render both components during SSR, and then remove the unnecessary one after hydration.


### `useMediaRenderer`

```ts
function useMediaRenderer(selector: MediaSelector): (
  render: (mediaCSS: any) => React.ReactElement,
) => React.ReactElement | null
```

The `useMediaRenderer` hook returns a function which can be used to prevent an element from being rendered when the browser media doesn't match the selector. During SSR, the element will *always* be rendered, but the render function will receive css which can be passed to the elements `css` prop to hide it using plain CSS.

```jsx
const renderWhenLarge = useMediaRenderer(defaultMediaQueries.large)
const renderWhenSmall = useMediaRenderer(defaultMediaQueries.small)

const maybeLargeElement = renderWhenLarge((hideWhenNotLargeCSS) => (
  <div css={hideWhenNotLargeCSS}>Large</div>
))
const maybeSmallElement = renderWhenSmall((hideWhenNotSmallCSS) => (
  <div css={hideWhenNotSmallCSS}>Small</div>
))

return (
  <>
    {maybeLargeElement}
    {maybeSmallElement}
  </>
)
```



License
-------

MIT licensed.
