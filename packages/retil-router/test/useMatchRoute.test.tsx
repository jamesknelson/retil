import '@testing-library/jest-dom/extend-expect'
import React, { StrictMode } from 'react'
import { render } from '@testing-library/react'

import {
  createRequest,
  getInitialSnapshot,
  RouterProvider,
  useMatchRoute,
} from '../src'

function testUseMatchRoute(
  description: string,
  pattern: string,
  pathname: string,
  expectedResult: boolean,
) {
  test(description, async () => {
    const snapshot = await getInitialSnapshot(
      ({ pathname }) => pathname,
      createRequest(pathname),
    )
    const Test = () => <>{useMatchRoute(pattern) ? 'match' : 'miss'}</>
    const { container } = render(
      <StrictMode>
        <RouterProvider value={snapshot as any}>
          <Test />
        </RouterProvider>
      </StrictMode>,
    )
    expect(container).toHaveTextContent(expectedResult ? 'match' : 'miss')
  })
}

describe('useMatch', () => {
  testUseMatchRoute(
    'matches nested paths on wildcard patterns',
    '/test*',
    '/test/nested',
    true,
  )

  testUseMatchRoute(
    'matches exact paths on wildcard patterns',
    '/test*',
    '/test',
    true,
  )

  testUseMatchRoute(
    'matches exact paths on exact patterns',
    '/test',
    '/test',
    true,
  )

  testUseMatchRoute('does not match parent paths', '/test*', '/', false)
})
