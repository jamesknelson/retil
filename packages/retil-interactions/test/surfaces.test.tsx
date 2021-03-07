import { render, cleanup } from '@testing-library/react'
import 'jest-styled-components'
import React, { forwardRef } from 'react'
import { useHighStyle } from 'retil-style'
import styled, { CSSProp } from 'styled-components'

import { ButtonSurface, SurfaceController } from '../src'

afterEach(cleanup)

describe('Surfaces', () => {
  const TestDiv = styled.div<{ css: CSSProp }>(({ css }) => css)

  const ButtonBody = forwardRef<HTMLDivElement, any>((props, ref) => (
    <TestDiv
      {...props}
      ref={ref}
      css={useHighStyle({
        color: {
          default: 'black',
          hover: 'red',
        },
      })}
    />
  ))

  test('add pseudoselector styles when appropriate', () => {
    const { getByTestId } = render(
      // Use a raw SurfaceController so that we can set the surfaceClassName
      // prop, as we need to know what it is when looking for the selector.
      <SurfaceController surfaceClassName="test-surface">
        {(connect) =>
          connect(
            <button type="button">
              <ButtonBody data-testid="body" />
            </button>,
          )
        }
      </SurfaceController>,
    )

    expect(getByTestId('body')).toHaveStyleRule('color', 'red', {
      modifier: '.test-surface:hover &',
    })
  })

  test('add styles when wrapped in a control component with interactionSelectors set to true', () => {
    const { getByTestId } = render(
      <ButtonSurface interactions={{ hover: true }}>
        <ButtonBody data-testid="body" />
      </ButtonSurface>,
    )

    expect(getByTestId('body')).toHaveStyleRule('color', 'red')
  })

  test('do not add styles when wrapped in a control component with interactionSelectors set to false', () => {
    const { getByTestId } = render(
      <ButtonSurface interactions={{ hover: false }}>
        <ButtonBody data-testid="body" />
      </ButtonSurface>,
    )

    expect(getByTestId('body')).toHaveStyleRule('color', 'black')
  })
})
