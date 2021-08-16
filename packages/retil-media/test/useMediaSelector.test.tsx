import { render, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import React from 'react'
import { CSSProvider } from 'retil-css'
import { ThemeContext, css } from 'styled-components'

import {
  ProvideMediaSelectors,
  createMediaSelector,
  mediaQueries,
  useMediaSelector,
} from '../src'

afterEach(cleanup)

describe('useMediaSelector', () => {
  test('to return undefined by default outside of the browser', () => {
    const mediaSelector = createMediaSelector(mediaQueries.medium)

    function Test() {
      const value = useMediaSelector(mediaSelector)
      return <>{String(value)}</>
    }

    const { container } = render(
      // Use a raw SurfaceController so that we can set the surfaceClassName
      // prop, as we need to know what it is when looking for the selector.
      <CSSProvider runtime={css} themeContext={ThemeContext}>
        <Test />
      </CSSProvider>,
    )

    expect(container).toHaveTextContent('undefined')
  })

  test('to return values set by <ProvideMediaSelectors>', () => {
    const mediaSelector = createMediaSelector(mediaQueries.medium)

    function Test() {
      const value = useMediaSelector(mediaSelector)
      return <>{String(value)}</>
    }

    const { container } = render(
      // Use a raw SurfaceController so that we can set the surfaceClassName
      // prop, as we need to know what it is when looking for the selector.
      <CSSProvider runtime={css} themeContext={ThemeContext}>
        <ProvideMediaSelectors override={[[mediaSelector, true]]}>
          <Test />
        </ProvideMediaSelectors>
      </CSSProvider>,
    )

    expect(container).toHaveTextContent('true')
  })
})
