import React from 'react'
import { render, cleanup } from '@testing-library/react'
import 'jest-styled-components'
import styled from 'styled-components'

import { control, hover, resetButtonCSS, ButtonControl } from '../src'

afterEach(cleanup)

describe('template helpers', () => {
  const ButtonBody = styled.div`
    color: black;

    ${hover`
      color: red;
    `}
  `

  test('add styles even when not wrapped in an control component', () => {
    const { getByTestId } = render(<ButtonBody data-testid="body" />)

    expect(getByTestId('body')).toHaveStyleRule('color', 'red', {
      modifier: ':hover',
    })
  })

  test('add styles when wrapped in a control component with forceSelectors set to true', () => {
    const { getByTestId } = render(
      <ButtonControl forceSelectors={{ hover: true }}>
        <ButtonBody data-testid="body" />
      </ButtonControl>,
    )

    expect(getByTestId('body')).toHaveStyleRule('color', 'red')
  })

  test('do not add styles when wrapped in a control component with forceSelectors set to false', () => {
    const { getByTestId } = render(
      <ButtonControl forceSelectors={{ hover: false }}>
        <ButtonBody data-testid="body" />
      </ButtonControl>,
    )

    expect(getByTestId('body')).toHaveStyleRule('color', 'black')
  })

  test('add pseudoselector-based styles when wrapped in a control component', () => {
    const StyledCustomButtonControl = styled.button`
      ${resetButtonCSS}
    `
    const CustomButtonControl = control(StyledCustomButtonControl)

    const { getByTestId } = render(
      <CustomButtonControl>
        <ButtonBody data-testid="body" />
      </CustomButtonControl>,
    )

    expect(getByTestId('body')).not.toHaveStyleRule('color', 'red', {
      modifier: ':hover',
    })
    expect(getByTestId('body')).toHaveStyleRule('color', 'red', {
      modifier: `${StyledCustomButtonControl}:hover &`,
    })
  })
})
