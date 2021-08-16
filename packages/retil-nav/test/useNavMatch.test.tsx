import '@testing-library/jest-dom/extend-expect'
import React, { StrictMode } from 'react'
import { render } from '@testing-library/react'

import { NavProvider, createStaticNavEnv, useNavMatcher } from '../src'

function testUseNavMatcher(
  description: string,
  pattern: string,
  pathname: string,
  expectedResult: boolean,
) {
  test(description, async () => {
    const env = createStaticNavEnv({ url: pathname })
    const Test = () => {
      const matcher = useNavMatcher()
      return <>{matcher(pattern) ? 'match' : 'miss'}</>
    }
    const { container } = render(
      <StrictMode>
        <NavProvider env={env}>
          <Test />
        </NavProvider>
      </StrictMode>,
    )
    expect(container).toHaveTextContent(expectedResult ? 'match' : 'miss')
  })
}

describe('useNavMatcher()', () => {
  testUseNavMatcher(
    'matches nested paths on wildcard patterns',
    '/test*',
    '/test/nested',
    true,
  )

  testUseNavMatcher(
    'matches exact paths on wildcard patterns',
    '/test*',
    '/test',
    true,
  )

  testUseNavMatcher(
    'matches exact paths on exact patterns',
    '/test',
    '/test',
    true,
  )

  testUseNavMatcher('does not match parent paths', '/test*', '/', false)
})
