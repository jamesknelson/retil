# retil-css

**Superpowers for decoupling style from behavior.**

✅ Works with [Styled Components](https://styled-components.com/) and [Emotion](https://emotion.sh/)
✅ SSR friendly
✅ Built for Concurrent React
✅ You'll wonder how you ever lived without it


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
