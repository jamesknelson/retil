import { render, cleanup } from '@testing-library/react'
import 'jest-styled-components'
import React from 'react'

import { ButtonSurface, ControlProvider, useConnectControl } from '../src'

afterEach(cleanup)

describe('Control', () => {
  test.skip('surfaces can be set to focus targets', () => {
    const { getByTestId } = render(
      <ControlProvider>
        <ButtonSurface {...useConnectControl()}>Test</ButtonSurface>
      </ControlProvider>,
    )

    const element = getByTestId('trigger')
  })
})
