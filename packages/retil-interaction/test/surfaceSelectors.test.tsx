/** @jsx jsx */
import { matchers } from '@emotion/jest'
import { css, jsx, ThemeContext } from '@emotion/react'
import { render, cleanup } from '@testing-library/react'
import { forwardRef } from 'react'
import { CSSProvider, highStyle } from 'retil-css'

import { inHoveredSurface, useSurfaceSelectorsConnector } from '../src'

// Add the custom matchers provided by '@emotion/jest'
expect.extend(matchers)

afterEach(cleanup)

describe('Surface Selectors', () => {
  const ButtonBody = forwardRef<HTMLDivElement, any>((props, ref) => (
    <div
      {...props}
      ref={ref}
      css={highStyle({
        color: {
          default: 'black',
          [inHoveredSurface]: 'red',
        },
      })}
    />
  ))

  test('add pseudoselector styles when appropriate', () => {
    function Test() {
      const [, mergeProps, provide] = useSurfaceSelectorsConnector()

      return provide(
        <button {...mergeProps()}>
          <ButtonBody data-testid="body" />
        </button>,
      )
    }

    const { getByTestId } = render(
      // Use a raw SurfaceController so that we can set the surfaceClassName
      // prop, as we need to know what it is when looking for the selector.
      <CSSProvider runtime={css} themeContext={ThemeContext}>
        <Test />
      </CSSProvider>,
    )

    expect(getByTestId('body')).toHaveStyleRule('color', 'red', {
      target: '.rx-1:hover',
    })
  })
})
