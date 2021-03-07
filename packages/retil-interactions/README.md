retil-interactions

- this package should be completely free of styles or integrations for specific,
  style libraries, but *does* contain useStyles, which takes a style object of
  various forms possibly *including* named selectors, and replaces any named
  selectors with selectors from the context.

- this package should contain usePopupTrigger, usePopup

- things to test:
  * can we configure for usage with styled-components using a single global Provider?
    we'd probably need to configure a way of patching theme context, as well as the
    stuff to actually patch it with.
    we'd want a separate retil-interactions-styled-components package to handle this

    For our surfaces, we can probably use constant class names instead of using
    class names generated for empty styled components. e.g. an AnchorSurface
    could have a "retil-anchor-surface" classname, and  we could just build our
    selectors based on that. No need for fancy styled components stuff.

    For <ControlContainer>, we can actually use a :first-child selector to pick
    out whatever control is the first child, which allows us to select anything.

- why may want to then export reset styles for anchors, buttons, inputs, etc.
  along with UnstyledAnchor, UnstyledButton, UnstyledInput, etc. in a separate
  package.

---

- surface and control primitives

  these render individual DOM elements, setting up context such that embedded
  styled components can target interaction states like `hover`, `disabled`, etc.

  * <AnchorSurface href>
  * <ButtonSurface activated onPress>
    * can be difficult to style, you may want to use a div surface instead
  * <DivSurface activated onPress?>
    * you'll need to manually set aria roles, as I don't want to make assumptions
  * <SubmitButtonSurface>
    * must be rendered inside a form
    * actually sets the "disabled" attribute when disabled

  exported by retil-router
  * <LinkSurface to> - will *not* change interaction state based on url
  * <NavLinkSurface to> - sets up default "activated" state based on url

  * <ControlProvider>
    * sets up an interaction context for a control, putting into the context a
      ref that can be passed to the focusable part of the control to extract its
      interaction state.
    * renders a DelegateFocusProvider, delegating focus on any surfaces
      to the control
  * useControlRef() - returns the ref created by ControlInteractionProvider
  * <ControlDiv control decorators? />
    * "control" is an element that will be rendered as the first child of this
      component. e.g. <input />, <select />, <button />, etc.
    * we'll look for both :focus and :focus-within on the :first-child selector,
      and put these selectors in the selector context of subsequent children.
      note that :focus-within won't work on older browsers, so for controls with
      nested markup where focus may be applied to internal elements, it may not work
    * we'll also pass in any ref provided by ControlProvider to `control`,
      ensuring that this can be used with control boundary surfaces, etc.
    * rendered in a <div> wrapper. could create non-div wrappers too, but we
      do need to have some kind of container so that we can use the :first-child
      selector to pick out the control
    * can be used outside of a ControlProvider, allowing interaction styles
      to be applied using pure CSS pseudoselectors and no extra event handlers.

  * custom controls can be built that don't need to be wrapped in
    ControlContainer. they just need to handle the state passed down by
    ControlProvider, e.g. allow it to focus the control, and pass the control
    ref to whatever part of the dom events should be bound to.

  * usePopup({
      trigger: boolean | PopupTrigger
    }): { style, connectTrigger, connectReaction, etc. }
    * wraps a popper and a popup trigger
    * can still be focused even if byFocus is not set, so long as the the
      TriggerSurface is focusable
    * connectTrigger sets the popper reference and popup trigger
    * connectReaction sets the popup 
    * if this is rendered inside a <ControlProvider>, then any surfaces within
      the popup will delegate focus to the control itself, allowing you to
      click the surfaces within the popup without removing focus from a trigger
      wrapping the control input.
  * <PopupProvider value={usePopup()}>
    * lets you put popup state into context, so that e.g. a menu can close
      the popup after click
  * <PopupTriggerConnector>
    * must be used inside a <PopupProvider>, expects to receive a single child
      and calls `connectTrigger` on it
    * Typically you'll wrap a surface with this. Note that in this case,
      passing "disabled" to the surface will not disable the trigger - in
      that case you'll need to separately pass "disabled" to the trigger.
    * If using the popup as a tooltip, you should pass appropriate aria
      roles to the trigger and reaction surfaces
  * <PopupReactionController>
  * `usePopupContext()`

  * a control is free to move focus around *inside* of it, and to move the tabIndex of
    any of its internal markup around. controls are basically black boxes. the only
    constraint is that the control must provide functions to focus/blur it, and it
    must render the control context ref on an element that events should be bound to.

- need to add modal interactions too...
