import '@testing-library/jest-dom/extend-expect'
import React, { StrictMode } from 'react'
import { render } from '@testing-library/react'

import { NavProvider, createStaticNavEnv, useNavMatch } from '../src'

function testUseMatchRoute(
  description: string,
  pattern: string,
  pathname: string,
  expectedResult: boolean,
) {
  test(description, async () => {
    const env = createStaticNavEnv({ url: pathname })
    const Test = () => <>{useNavMatch(pattern) ? 'match' : 'miss'}</>
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

describe('useNavMatch()', () => {
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
