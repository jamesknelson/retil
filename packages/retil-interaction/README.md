retil-interactions
===


There are three things that I've been trying to accomplish with a connect component:

1. merge props that an interaction needs to apply with other props, and to do
   so in a way that prevents new ref functions being created on every render.
2. add providers to the returned element.
3. access context which may not be available in the rendering component due
   to the provider being rendered by the same component

#1 could actually probably be implemented by allowing any props to be passed
into the `useXProps` hooks, except the ones that are overridden.

#2 *could* be handled by a connect function-returning hook

#3 needs an embedded component to access the context, at which point we'll
   probably either want a HoC or a "connect" component.

   at this point, I'm more in favor of "Connect" components.


There are also some components where instead of a "Connect" component, you
can just provide a component hooked up as-is. E.g. Trigger surface, arrow
component (which you can style by passing a class), etc. If you need any
more control in these cases, it makes sense to just create a custom
component with the hook.






"Connect" components are components that accept a "children" fn, a "mergeProps"
object, and then call the "children" function with the "mergeProps" object,
along with any other props that component is connecting. They also accept a
separate "mergeRef" prop, which is typed based on the result of the children.

- maybe instead of connect components, we can make connect hooks, that return
  a function that takes an element or a render function and returns an element
  wrapped with whatever providers/etc. are needed?

"handle" objects should never change, so that they're safe to be passed to
"useImperativeHandle" etc.

TODO:

- Rename "controllers" to "handles". The name "handle" has the benefit of not
  implying that everything on the object has to be a function. E.g. it could
  contain sources and constants as well.


REFERENCE:

- Tooltips: https://accessibility.athena-ict.com/aria/examples/tooltip.shtml
- Popup menus: https://www.w3.org/TR/2016/WD-wai-aria-practices-1.1-20161214/examples/menu-button/menu-button-1/menu-button-1.html

TODO:

- add `disabled`





popupTriggerServiceConfigurator(initialConfig: PopupTriggerConfig): readonly [
  reconfigure: (nextConfig: PopupTriggerConfig) => void,
  readonly [
    source: Source<{
      triggered,
      focused,
      hovering,
      selected,
    }>, 
    controller: {
      close,
      open,
      setTriggerElement,
      setReactionElement,
    },
  ]
]

// https://github.com/popperjs/react-popper/blob/master/src/usePopper.js
// https://github.com/popperjs/react-popper/blob/master/src/Popper.js
// - this can be placed within the popup connector instead of the wrapper,
//   ensuring that style updates only effect the popup itself, not requiring
//   re-renders of the rest of the app.
popupPositionerServiceConfigurator(initialConfig: PopperConfig): readonly [
  source: Source<{
    style,
  }>,
  controller: {
    setTriggerElement: (Element | VirtualElement) => void,
    setReactionElement: (HTMLElement) => void,
  },
  reconfigure: (nextConfig: PopperConfig) => void
]

- usePopup({
    disabled,
    focusable,
    trigger: boolean | PopupTriggerConfig,
    positioner: PopupPositionerConfig
  }): { style, connectTrigger, connectReaction, etc. }
  * can still be focused even if byFocus is not set
  * pulls disabled/focusable from InteractionDefaultsContext
    
- <PopupProvider disabled? trigger? popper? children={node} />
  * adds an opaque identifier to context for aria purposes
  * ideally we'd be able to set different popper/trigger options based
    on different media queries
- <ConnectPopupTrigger children={element | (({ connectSurface, connectReference }) => node)}>
  * must be used inside a <PopupProvider>, expects to receive a single child
    and calls `connectTrigger` on it
  * Typically you'll wrap a surface with this. Note that in this case,
    you'll need to pass `disabled` to the popup itself to disable it –
    passing it to the surface won't affect the popup behavior.
  * If using the popup as a tooltip, you should pass appropriate aria
    roles to the trigger and reaction surfaces
- <ConnectPopupReaction children={element | (({ connectPopup, connectArrow, styles, ... }) => node)}>
- `usePopupContext()`

- <PopupMenuProvider>
  * wraps in control + popup provider, except if its already
    within a control provider, in which case it skips that part
- <PopupMenuTriggerSurface>
  * sets correct aria stuff
  * sets itself as control target if the closest <PopupMenuProvider>
    created a control context
  * listens for up/down keys if it has focus
- <PopupMenuReactionSurface>
  * sets correct aria stuff
- need stuff for scroll up/down (or left/right on mobile), as well
  as for sub menus. the controller (controllers have refs) should
  also expose methods for navigation within the menu, and for handling
  key presses. note that this is just for control / hooking up event
  handlers. styles can differ wildly based on whether they're on
  the desktop/mobile.


- any surfaces that can be created be wrapping one surface with a
  <ConnectSomething> can then be defined as needed by your app. e.g.
  * <PopupTriggerSurface>
  * <PopupLinkSurface> (which closes the popup menu on click)

- modal interaction that handles:
  * listening for click on backdrop
  * listening for escape key on document
  * setting aria-hidden on rest of app root
  * disabling scroll on document body
  * somehow setting all other tabindexes to -1 temporarily (may require a top level tabIndex provider)
