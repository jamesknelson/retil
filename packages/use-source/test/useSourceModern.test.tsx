import '@testing-library/jest-dom/extend-expect'
import React, { Suspense, unstable_useTransition as useTransition } from 'react'
import ReactDOM from 'react-dom'
import { act } from 'react-dom/test-utils'

import { delay } from 'retil-support'
import { createState } from 'retil-source'

import { useSourceModern as useSource } from '../src'

jest.mock('scheduler', () => require('scheduler/unstable_mock'))

describe(`useSource (concurrent implementation)`, () => {
  let container!: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    container = null as any
  })

  test(`supports concurrent mode transitions`, async () => {
    let busyCount = 0

    const [stateSource, setState] = createState(1)
    const config = { timeoutMs: 10000 }
    const Test = () => {
      const [startTransition, busy] = useTransition(config)
      const value = useSource(stateSource, { startTransition })
      if (busy) {
        busyCount++
      }
      return (
        <>
          <span id="status">{busy ? 'busy' : 'ready'}</span>
          <Suspense fallback={<span id="loading">loading</span>}>
            <TestInner value={value} />
          </Suspense>
        </>
      )
    }
    const TestInner = (props: any) => {
      if (props.value === 2) throw delay(20000)
      return <span id="value">{String(props.value)}</span>
    }

    act(() => {
      ;(ReactDOM as any).unstable_createRoot(container).render(<Test />)
    })

    expect(document.querySelector('#status')?.textContent).toBe('ready')
    expect(document.querySelector('#value')?.textContent).toBe('1')

    act(() => {
      setState(2)
    })

    // React doesn't seem to wait in while running tests, while it does in
    // real browsers. See:
    // https://frontarm.com/demoboard/?id=1d5f9c97-2bca-41fa-ae23-d45fe7b253f9
    expect(busyCount > 0).toBe(true)
    // expect(document.querySelector('#loading')).toBeNull()
    // expect(document.querySelector('#status')?.textContent).toBe('busy')

    const previousBusyCount = busyCount

    expect(document.querySelector('#value')?.textContent).toBe('1')

    await delay(20)

    expect(document.querySelector('#value')?.textContent).toBe('1')
    expect(document.querySelector('#loading')).toBeDefined()
    expect(document.querySelector('#status')?.textContent).toBe('ready')
    expect(busyCount).toBe(previousBusyCount)

    act(() => {
      setState(3)
    })

    expect(document.querySelector('#value')?.textContent).toBe('3')
    expect(busyCount > previousBusyCount).toBe(true)
  })
})
