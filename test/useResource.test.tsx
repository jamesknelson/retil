import React from 'react'
import { renderHook, act } from '@testing-library/react-hooks'

import {
  Provider,
  createDocumentResource,
  createStore,
  useResource,
} from '../src'
import { internalSetDefaultStore } from '../src/store/defaults'

describe('useResource()', () => {
  // Use a new store for each model instance.
  beforeEach(() => {
    internalSetDefaultStore(createStore())
  })

  test('returns without suspending', async () => {
    const resource = createDocumentResource(
      async (vars: string) => 'value for ' + vars,
    )

    const { result, waitForNextUpdate } = renderHook(
      () => useResource(resource, 'hello')[0],
    )
    expect(result && result.current.hasData).toBe(false)
    expect(result && result.current.pending).toBe(true)
    expect(result && result.current.primed).toBe(false)

    // Ignore the data we eventually receive
    await waitForNextUpdate()
  })

  test('loads data automatically', async () => {
    const resource = createDocumentResource(
      async (vars: string) => 'value for ' + vars,
    )

    const { result, wait } = renderHook(() => useResource(resource, 'hello')[0])
    await act(async () => {
      await wait(() => result.current.pending)
      await wait(() => result.current.hasData)
    })
    expect(result && result.current.data).toBe('value for hello')
  })

  test('suspends until data is available when `getData()` is called', async () => {
    const resource = createDocumentResource(
      async (vars: string) => 'value for ' + vars,
    )

    const { result, waitForNextUpdate } = renderHook(() =>
      useResource(resource, 'hello')[0].getData(),
    )
    await waitForNextUpdate()
    expect(result && result.current).toBe('value for hello')
  })

  test('supports conditional rendering by allowing for null resources', async () => {
    const { result } = renderHook(() => useResource(null))
    expect(result && result.current[1]).toBe(null)
  })

  test('accepts store via options or context', async () => {
    const resource = createDocumentResource(
      async (vars: string) => 'value for ' + vars,
    )

    const store1 = createStore()
    const hook1 = renderHook(() =>
      useResource(resource, { vars: 'hello1', store: store1 })[0].getData(),
    )

    expect(hook1.result && hook1.result.current).toBe(null)

    await hook1.waitForNextUpdate()

    // Dehydrate should wait for the fetch to complete.
    const dehydratedState = await store1.dehydrate()

    // Data should be immediately available, without waiting for suspense.
    const store2 = createStore(dehydratedState)
    const hook2 = renderHook(
      () => useResource(resource, 'hello1')[0].getData(),
      {
        wrapper: ({ children }: any) => (
          <Provider store={store2}>{children}</Provider>
        ),
      },
    )
    expect(hook2.result && hook2.result.current).toBe('value for hello1')

    await hook2.waitForNextUpdate()
  })

  test('does not fetch data when `pause` is true', async () => {
    let fetchCount = 0
    const resource = createDocumentResource(async (vars: string) => {
      fetchCount++
      return 'value for ' + vars
    })
    const { result, wait } = renderHook(
      () =>
        useResource(resource, {
          pause: true,
          vars: 'hello',
        })[0],
    )
    await expect(
      wait(() => !result.current.pending, { timeout: 1000 }),
    ).rejects.toBeInstanceOf(Error)
    expect(fetchCount).toBe(0)
    expect(result.current.pending).toBe(true)
  })
})
