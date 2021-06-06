import React, { useCallback, useContext, useMemo } from 'react'

import { cssFunctionContext } from './styleContext'
import { useMediaQuery } from './useMediaQuery'

export function useMediaRenderer(
  mediaQuery: string,
): (
  render: (mediaCSS: any) => React.ReactElement,
) => React.ReactElement | null {
  const css = useContext(cssFunctionContext)
  const result = useMediaQuery(mediaQuery)
  const mediaCSS = useMemo(
    () => css`
      @media not ${mediaQuery} {
        display: none !important;
      }
    `,
    [css, mediaQuery],
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
