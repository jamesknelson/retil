import React, { useCallback, useMemo } from 'react'
import { useCSSTheme, useCSSSelectors } from 'retil-css'

import { MediaSelector } from './mediaSelector'
import { useMediaSelector } from './useMediaSelector'

export function useMediaRenderer(
  mediaSelector: MediaSelector,
): (
  render: (mediaCSS: any) => React.ReactElement,
) => React.ReactElement | null {
  const { runtime: css } = useCSSTheme()
  const [selectorString] = useCSSSelectors([mediaSelector])
  const result = useMediaSelector(mediaSelector)
  const mediaCSS = useMemo(
    () =>
      selectorString === false
        ? css`
            display: none;
          `
        : selectorString === true
        ? undefined
        : css`
            @media not ${selectorString.replace('@media ', '')} {
              display: none !important;
            }
          `,
    [css, selectorString],
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
