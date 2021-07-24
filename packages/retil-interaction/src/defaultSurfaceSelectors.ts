import { createSurfaceSelector } from './surfaceSelector'

export const inActiveSurface = createSurfaceSelector(':active')

export const inDisabledSurface = createSurfaceSelector('[aria-disabled]')

/**
 * Allows you to apply styles to a surface that is in an error state, e.g. when
 * it failed to submit data and doesn't know why. Typically this should only
 * be used for exceptional errors where we haven't received a valid response
 * from the server. For issuse where we know what's gone wrong, use "invalid".
 */
export const inErrorSurface = createSurfaceSelector(false)

export const inFocusedSurface = createSurfaceSelector(':focus')
export const inHoverSurface = createSurfaceSelector(':hover')

/**
 * Used to target surfaces which are not yet active, as they're rendered by
 * pre-rendered HTML that hasn't become active yet.
 */
export const inHydratingSurface = createSurfaceSelector(false)

/**
 * Used to indicate that the data represented by a control, or the request that
 * would be made by an action, does not meet the requirements expected for
 * success.
 */
export const inInvalidSurface = createSurfaceSelector(false)

/**
 * Used to represent an "on", "current", "checked", etc. state, for example, to
 * represent check boxes, toggle buttons, or navigation links.
 */
export const inToggledSurface = createSurfaceSelector(':checked')

export const inValidSurface = createSurfaceSelector(false)

/**
 * Used to indicate that the surface has initiated some asynchronous work,
 * and is still waiting for it to complete. Note that this does *not*
 * indicate that the surface is disabled.
 */
export const inWorkingSurface = createSurfaceSelector(false)

// Other possible surface selectors:
// - selected
//   * when an item that is selected, not checked, and not focused
//     i.e. selected item in a multi-select list, where focus is on the list
//          itself, and hitting enter/space toggles checked
// - success
//   * when an action was taken successfully, and this prevents the action
//     from being performed again
