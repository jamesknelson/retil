import { render, cleanup } from '@testing-library/react'
import 'jest-styled-components'
import React, { forwardRef } from 'react'
import { CSSProvider, highStyle } from 'retil-css'
import styled, { CSSProp, ThemeContext, css } from 'styled-components'

import { inHoveredSurface, useSurfaceSelectorsConnector } from '../src'

afterEach(cleanup)

describe('Surface Selectors', () => {
  const TestDiv = styled.div<{ css: CSSProp }>(({ css }) => css)

  const ButtonBody = forwardRef<HTMLDivElement, any>((props, ref) => (
    <TestDiv
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
      modifier: '.rx-1:hover &',
    })
  })
})
