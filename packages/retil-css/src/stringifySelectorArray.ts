/**
 * Take an array of relative selectors, and add '&' characters as appropriate
 * for the location of this selector relative to the surface it is targeting.
 *
 * Also strips any trailing `~` character, allowing surfaces to be targeted
 * at subsequent siblings.
 */
export function stringifySelectorArray(
  selectors: string[],
  isOnBoundary: boolean,
): string {
  return selectors
    .map((selector) =>
      isOnBoundary
        ? '&' + selector.replace(/\s*~\s*&*\s*$/g, '')
        : selector + (selector.trim().slice(-1) !== '&' ? ' &' : ''),
    )
    .join(',')
}
