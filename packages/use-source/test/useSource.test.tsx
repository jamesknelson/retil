import '@testing-library/jest-dom/extend-expect'
import React, { Suspense } from 'react'
import { act, render } from '@testing-library/react'
import { createStateService, fuse } from '@retil/source'

import { useSource as useSourceModern } from '../src/useSource.modern'
import { useSource as useSourceSubscription } from '../src/useSource.subscription'

function testUseSource(useSource: typeof useSourceModern) {
  test(`can get the latest value`, () => {
    const [stateSource] = createStateService('success')
    const Test = () => <>{useSource(stateSource)}</>
    const { container } = render(
      <Suspense fallback="loading">
        <Test />
      </Suspense>,
    )
    expect(container).toHaveTextContent('success')
    expect(container).not.toHaveTextContent('loading')
  })

  test(`suspends when there is no initial value`, () => {
    const [stateSource] = createStateService()
    const Test = () => <>{useSource(stateSource)}</>
    const { container } = render(
      <Suspense fallback="loading">
        <Test />
      </Suspense>,
    )
    expect(container).toHaveTextContent('loading')
  })

  test(`doesn't suspends when there is no initial value, but a default value is provided`, () => {
    const [stateSource] = createStateService()
    const Test = () => <>{useSource(stateSource, 'default')}</>
    const { container } = render(
      <Suspense fallback="loading">
        <Test />
      </Suspense>,
    )
    expect(container).toHaveTextContent('default')
    expect(container).not.toHaveTextContent('loading')
  })

  test(`causes a re-render when the source notifies subscribers of a new value`, () => {
    const [stateSource, setState] = createStateService()
    const Test = () => <>{useSource(stateSource, 'default')}</>
    const { container } = render(<Test />)

    act(() => {
      setState('success')
    })

    expect(container).toHaveTextContent('success')
  })

  test(`updates to the default when changing to a missing value`, () => {
    const [stateSource, setState] = createStateService(0)
    const [missingSource] = createStateService()
    const source = fuse((use) => {
      const state = use(stateSource)
      return state === 0 ? use(missingSource, state) : use(missingSource)
    })
    const Test = () => <>{useSource(source, 'default')}</>
    const { container } = render(<Test />)

    expect(container).not.toHaveTextContent('default')
    act(() => {
      setState(1)
    })
    expect(container).toHaveTextContent('default')
  })

  test(`suspends on updates to missing values`, () => {
    const [stateSource, setState] = createStateService(0)
    const [missingSource] = createStateService()
    const source = fuse((use) => {
      const state = use(stateSource)
      if (state === 0) {
        return 'value-' + use(missingSource, state)
      } else {
        return use(missingSource)
      }
    })
    const Test = () => <>{useSource(source)}</>
    const { container } = render(
      <Suspense fallback="loading">
        <Test />
      </Suspense>,
    )

    expect(container).toHaveTextContent('value-0')
    act(() => {
      setState(1)
    })
    expect(container).toHaveTextContent('loading')
  })
}

describe(`useSource (modern implementation)`, () => {
  const useSource = useSourceModern
  testUseSource(useSource)
})

describe(`useSource (subscription implementation)`, () => {
  const useSource = useSourceSubscription
  testUseSource(useSource)
})
