import React, { useCallback, useMemo } from 'react'
import { useCSSRuntime, useCSSSelectors } from 'retil-css'

import { MediaSelector } from './mediaSelector'
import { useMediaSelector } from './useMediaSelector'

export function useMediaRenderer(
  mediaSelector: MediaSelector,
): (
  render: (mediaCSS: any) => React.ReactElement,
) => React.ReactElement | null {
  const css = useCSSRuntime()
  const [selector] = useCSSSelectors([mediaSelector])
  const nonArraySelector = (
    Array.isArray(selector) ? selector.join(',') : selector
  ) as string | boolean
  const result = useMediaSelector(mediaSelector)
  const mediaCSS = useMemo(
    () =>
      nonArraySelector === false
        ? css`
            display: none;
          `
        : nonArraySelector === true
        ? undefined
        : css`
            @media not ${nonArraySelector.replace('@media ', '')} {
              display: none !important;
            }
          `,
    [css, nonArraySelector],
  )
  const cssRenderer = useCallback(
    (render: (mediaCSS: any) => React.ReactElement): React.ReactElement =>
      render(mediaCSS),
    [mediaCSS],
  )
  const jsRenderer = useCallback(
    (
      render: (mediaCSS: any) => React.ReactElement,
    ): React.ReactElement | null => (result ? render(null) : null),
    [result],
  )

  return result === undefined ? cssRenderer : jsRenderer
}
