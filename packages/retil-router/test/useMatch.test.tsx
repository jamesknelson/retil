import '@testing-library/jest-dom/extend-expect'
import React, { StrictMode } from 'react'
import { render } from '@testing-library/react'

import { getInitialStateAndResponse, RouterProvider, useMatch } from '../src'

function testUseMatch(
  description: string,
  pattern: string,
  pathname: string,
  expectedResult: boolean,
) {
  test(description, async () => {
    const [state] = await getInitialStateAndResponse(
      ({ pathname }) => pathname,
      pathname,
    )
    const Test = () => <>{useMatch(pattern) ? 'match' : 'miss'}</>
    const { container } = render(
      <StrictMode>
        <RouterProvider value={state}>
          <Test />
        </RouterProvider>
      </StrictMode>,
    )
    expect(container).toHaveTextContent(expectedResult ? 'match' : 'miss')
  })
}

describe('useMatch', () => {
  testUseMatch(
    'matches nested paths on wildcard patterns',
    '/test*',
    '/test/nested',
    true,
  )

  testUseMatch(
    'matches exact paths on wildcard patterns',
    '/test*',
    '/test',
    true,
  )

  testUseMatch('matches exact paths on exact patterns', '/test', '/test', true)

  testUseMatch('does not match parent paths', '/test*', '/', false)
})
