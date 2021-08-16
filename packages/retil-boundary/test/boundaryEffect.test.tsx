import { render, cleanup } from '@testing-library/react'
import React from 'react'

import { useBoundaryEffect } from '../src'

afterEach(cleanup)

describe('useBoundaryEffect', () => {
  test('works without boundary', () => {
    let passes = false
    function Test() {
      useBoundaryEffect(() => {
        passes = true
      })
      return null
    }

    render(<Test />)

    expect(passes).toBe(true)
  })
})
