import '@testing-library/jest-dom/extend-expect'
import React, { Suspense } from 'react'
import { act, render } from '@testing-library/react'

import { createState, fuse, useSource } from '../src'

test(`accepts null sources`, () => {
  const Test = () => (
    <>
      {useSource(null, { defaultValue: 'default' }) === 'default'
        ? 'success'
        : 'failure'}
    </>
  )
  const { container } = render(<Test />)
  expect(container).toHaveTextContent('success')
})

test(`can get the latest value`, () => {
  const [stateSource] = createState('success')
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
  const [stateSource] = createState()
  const Test = () => <>{useSource(stateSource)}</>
  const { container } = render(
    <Suspense fallback="loading">
      <Test />
    </Suspense>,
  )
  expect(container).toHaveTextContent('loading')
})

test(`can switch from a null source to a source with no initial value`, () => {
  let setState: any

  const [stateSource] = createState()
  const Test = () => {
    const stateHook = React.useState(null)
    setState = stateHook[1]
    return <>{useSource(stateSource, { defaultValue: 'null' })}</>
  }
  const { container } = render(
    <Suspense fallback="loading">
      <Test />
    </Suspense>,
  )
  expect(container).toHaveTextContent('null')
  act(() => {
    setState(stateSource)
  })
  expect(container).not.toHaveTextContent('loading')
})

test(`doesn't suspends when there is no initial value, but a default value is provided`, () => {
  const [stateSource] = createState()
  const Test = () => <>{useSource(stateSource, { defaultValue: 'default' })}</>
  const { container } = render(
    <Suspense fallback="loading">
      <Test />
    </Suspense>,
  )
  expect(container).toHaveTextContent('default')
  expect(container).not.toHaveTextContent('loading')
})

test(`causes a re-render when the source notifies subscribers of a new value`, () => {
  const [stateSource, setState] = createState()
  const Test = () => <>{useSource(stateSource, { defaultValue: 'default' })}</>
  const { container } = render(<Test />)

  act(() => {
    setState('success')
  })

  expect(container).toHaveTextContent('success')
})

test(`updates to the default when changing to a missing value`, () => {
  const [stateSource, setState] = createState(0)
  const [missingSource] = createState()
  const source = fuse((use) => {
    const state = use(stateSource)
    return state === 0 ? use(missingSource, state) : use(missingSource)
  })
  const Test = () => <>{useSource(source, { defaultValue: 'default' })}</>
  const { container } = render(<Test />)

  expect(container).not.toHaveTextContent('default')
  act(() => {
    setState(1)
  })
  expect(container).toHaveTextContent('default')
})

test(`suspends on updates to missing values`, () => {
  const [stateSource, setState] = createState(0)
  const [missingSource] = createState()
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
