import '@testing-library/jest-dom/extend-expect'
import * as React from 'react'
import { Deferred, delay } from 'retil-support'
import { act, render, waitFor } from '@testing-library/react'

import { Operation, UseOperationResult, useOperation } from '../src'

describe('useOperation', () => {
  function renderUseOperation<Input = void, Output = any>(
    operation: Operation<Input, Output>,
    ...deps: any[][]
  ) {
    const result = {
      current: (undefined as any) as UseOperationResult<Input, Output>,
    }
    const results = [] as UseOperationResult<Input, Output>[]
    const Wrapper = ({ operation, deps }: any) => {
      result.current = useOperation(operation, ...deps)
      results.push(result.current)
      return <></>
    }
    const root = render(<Wrapper operation={operation} deps={deps} />)
    const rerender = (
      operation: Operation<Input, Output>,
      ...deps: any[][]
    ) => {
      root.rerender(<Wrapper operation={operation} deps={deps} />)
    }
    return { result, results, rerender }
  }

  test(`returns an array of length 2 before a result is available`, async () => {
    const { result } = renderUseOperation(() => delay(100))
    const [trigger] = result.current

    await act(async () => {
      trigger()
    })

    expect(result.current.length).toBe(2)
  })

  test(`can indicate an undefined result by returning an array of length 3`, async () => {
    const { result } = renderUseOperation(() => Promise.resolve(undefined))
    const [trigger] = result.current

    await act(async () => {
      trigger()
    })
    expect(result.current.length).toBe(3)
    expect(result.current[2]).toBe(undefined)
  })

  test(`doesn't go pending immediately`, async () => {
    const { result } = renderUseOperation(() => delay(100))
    const [trigger] = result.current

    act(() => {
      trigger()
    })
    expect(result.current[1]).toBe(false)
  })

  test(`doesn't enter pending at all for immediately resolved promises`, async () => {
    const promise = Promise.resolve('test')
    const { result, results } = renderUseOperation(() => promise)
    const [trigger] = result.current

    await act(async () => {
      trigger()
    })
    expect(result.current[2]).toBe('test')
    expect(results.some((result) => result[1])).toBe(false)
  })

  test(`leaves pending when result resolves`, async () => {
    const deferred = new Deferred()
    const { result } = renderUseOperation(() => deferred.promise)
    const [trigger] = result.current

    await act(async () => {
      trigger()
    })
    await waitFor(() => {
      expect(result.current[1]).toBe(true)
    })
    await act(async () => {
      deferred.resolve(true)
    })
    expect(result.current[1]).toBe(false)
  })

  test(`changing the operation does not affect the pending operation`, async () => {
    const { result, rerender } = renderUseOperation(() =>
      delay(100).then(() => 'test-1'),
    )
    const [trigger] = result.current

    await act(async () => {
      trigger()
    })
    await waitFor(() => {
      expect(result.current[1]).toBe(true)
    })
    await act(async () => {
      rerender(() => delay(100).then(() => 'test-2'))
    })
    await waitFor(() => {
      expect(result.current[1]).toBe(false)
    })
    expect(result.current[2]).toBe('test-1')
  })

  test(`clears results when triggering a new operation`, async () => {
    const { result } = renderUseOperation(delay)
    const [trigger] = result.current

    await act(async () => {
      trigger(0)
    })
    await waitFor(() => {
      expect(result.current.length).toBe(3)
    })
    expect(result.current[1]).toBe(false)
    await act(async () => {
      trigger(100)
    })
    await waitFor(() => {
      expect(result.current[1]).toBe(true)
    })
    expect(result.current.length).toBe(2)
  })

  test(`doesn't override results on out of order completion`, async () => {
    const { result } = renderUseOperation((promise: Promise<any>) => promise)
    const [trigger] = result.current
    const deferred1 = new Deferred()
    const deferred2 = new Deferred()
    await act(async () => {
      trigger(deferred1.promise)
      await delay(100)
    })
    await act(async () => {
      trigger(deferred2.promise)
      await delay(100)
    })
    await act(async () => {
      deferred2.resolve('test-2')
    })
    expect(result.current[2]).toBe('test-2')
    await act(async () => {
      deferred1.resolve('test-1')
    })
    expect(result.current[2]).toBe('test-2')
  })

  test(`returns the operation result via the promise returned from trigger`, async () => {
    const { result } = renderUseOperation(() => Promise.resolve('test'))
    const [trigger] = result.current
    await act(async () => {
      const value = await trigger()
      expect(value).toBe('test')
    })
  })
})
