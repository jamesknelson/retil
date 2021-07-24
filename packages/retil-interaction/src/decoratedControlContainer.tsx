// * <DecoratedControlContainer control decorators? />
//   * "control" is an element that will be rendered as the first child of this
//     component. e.g. <input />, <select />, <button />, etc.
//   * we'll look for both :focus and :focus-within on the :first-child selector,
//     and put these selectors in the selector context of subsequent children.
//     note that :focus-within won't work on older browsers, so for controls with
//     nested markup where focus may be applied to internal elements, it may not work
//   * we'll also pass in any ref provided by ControlProvider to `control`,
//     ensuring that this can be used with control boundary surfaces, etc.
//   * rendered in a <div> wrapper. could create non-div wrappers too, but we
//     do need to have some kind of container so that we can use the :first-child
//     selector to pick out the control
//   * can be used outside of a ControlProvider, allowing interaction styles
//     to be applied using pure CSS pseudoselectors and no extra event handlers.

// - hover selector will target the container itself
// - active/disabled/focus selectors will be based on `input ~ &`
// - the container and all non-input elements will delegate focus to the input
// - sub-surfaces can provide their own context to move the hover selector,
//   and may also update the "active" selector (need to test this works or
//   maybe implement javascript-based forcing for it), but sub-surfaces won't
//   provide focus selectors as focus should stay within the input itself.
