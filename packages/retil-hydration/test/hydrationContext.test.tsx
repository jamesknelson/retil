import '@testing-library/jest-dom/extend-expect'
import { act, render, cleanup } from '@testing-library/react'
import React from 'react'

import { useHasHydrated, useMarkAsHydrated } from '../src'

afterEach(cleanup)

describe('useHasHydrated', () => {
  test('returns false until hydrated', () => {
    let markAsHydrated: () => void

    function HasHydrated() {
      markAsHydrated = useMarkAsHydrated()
      return <>{String(useHasHydrated())}</>
    }

    const { container } = render(<HasHydrated />)

    expect(container).toHaveTextContent('false')

    act(() => {
      markAsHydrated()
    })

    expect(container).toHaveTextContent('true')
  })
})
