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
      current: undefined as any as UseOperationResult<Input, Output>,
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
    const deferred = new Deferred()
    const { result } = renderUseOperation(() => deferred.promise)
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
    const deferred = new Deferred()
    const { result } = renderUseOperation(() => deferred.promise)
    const [trigger] = result.current

    trigger()
    expect(result.current[1]).toBe(false)

    // Wait for the non-immediate promise to resolve
    await act(async () => {})
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
    deferred.resolve(true)
    await act(() => deferred.promise)
    expect(result.current[1]).toBe(false)
  })

  test(`changing the operation does not affect the pending operation`, async () => {
    const deferred1 = new Deferred()
    const deferred2 = new Deferred()
    const { result, rerender } = renderUseOperation(() => deferred1.promise)
    const [trigger] = result.current

    await act(async () => {
      trigger()
    })
    expect(result.current[1]).toBe(true)
    await act(async () => {
      rerender(() => deferred2.promise.then(() => 'test-2'))
    })
    deferred1.resolve('test-1')
    await act(() => deferred1.promise)
    expect(result.current[1]).toBe(false)
    expect(result.current[2]).toBe('test-1')
  })

  test(`clears results when triggering a new operation`, async () => {
    const deferreds = [new Deferred(), new Deferred()]
    const { result } = renderUseOperation((i: number) => deferreds[i].promise)
    const [trigger] = result.current

    await act(async () => {
      trigger(0)
    })
    deferreds[0].resolve('test')
    await act(() => deferreds[0].promise)
    expect(result.current.length).toBe(3)
    expect(result.current[1]).toBe(false)
    await act(async () => {
      trigger(1)
    })
    expect(result.current[1]).toBe(true)
    expect(result.current.length).toBe(2)
  })

  test(`doesn't override results on out of order completion`, async () => {
    const { result } = renderUseOperation((promise: Promise<any>) => promise)
    const [trigger] = result.current
    const deferred1 = new Deferred()
    const deferred2 = new Deferred()
    await act(async () => {
      trigger(deferred1.promise)
    })
    await act(async () => {
      trigger(deferred2.promise)
    })
    await delay(50)
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
