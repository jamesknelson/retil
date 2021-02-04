import '@testing-library/jest-dom/extend-expect'
import * as React from 'react'
import { act, render } from '@testing-library/react'

import { UseIssuesOptions, UseIssuesTuple, useIssues } from '../src'

describe('useIssues', () => {
  function renderUseIssues<Value extends object>(
    value: Value,
    options?: UseIssuesOptions<Value>,
  ) {
    const result = {
      current: (undefined as any) as UseIssuesTuple<Value>,
    }
    const results = [] as UseIssuesTuple<Value>[]
    const Wrapper = ({ data, options }: any) => {
      result.current = useIssues(data, options)
      results.push(result.current)
      return <></>
    }
    const root = render(<Wrapper data={value} options={options} />)
    const rerender = (value: Value, options?: UseIssuesOptions<Value>) => {
      root.rerender(<Wrapper data={value} options={options} />)
    }
    return { result, results, rerender }
  }

  test(`returns no issues initially`, () => {
    const { result } = renderUseIssues({ username: null })
    const [issues] = result.current

    expect(issues.length).toBe(0)
  })

  test(`can add unresolved issues`, () => {
    const { result } = renderUseIssues({ username: null })

    const addIssues = result.current[1]

    act(() => {
      addIssues((value) => [
        value.username === null && { message: 'missing', path: 'username' },
      ])
    })

    const [issues] = result.current

    expect(issues.length).toBe(1)
    expect(issues[0]).toMatchObject({
      path: 'username',
      code: 'missing',
      message: 'missing',
    })
  })

  test(`can add a validator returning an object containing arrays of messages`, () => {
    const { result } = renderUseIssues({ email: null, password: null })

    const addIssues = result.current[1]

    act(() => {
      addIssues(() => ({
        email: ['missing'],
        password: ['wrong'],
      }))
    })

    const [issues] = result.current
    expect(issues.length).toBe(2)
    expect(issues[0]).toMatchObject({
      path: 'email',
      message: 'missing',
    })
    expect(issues[1]).toMatchObject({
      path: 'password',
      message: 'wrong',
    })
  })

  test(`adding resolved issues silently disappears them`, () => {
    const { result } = renderUseIssues({ username: 'test-1' })

    const addIssues = result.current[1]

    act(() => {
      addIssues((value) => [
        value.username === 'test-2' && { message: 'duplicate' },
      ])
    })

    const [issues] = result.current
    expect(issues.length).toBe(0)
  })

  test(`adding issues that have already been resolved returns a promise to "true"`, async () => {
    const { result } = renderUseIssues({ username: 'test-1' })
    const addIssues = result.current[1]
    let valid: boolean
    await act(async () => {
      valid = await addIssues((value) => [
        value.username === 'test-2' && { message: 'duplicate' },
      ])[1]
    })
    expect(valid!).toBe(true)
  })

  test(`adding unresolved issues returns a promise to "false"`, async () => {
    const { result } = renderUseIssues({ username: 'test-1' })
    const addIssues = result.current[1]
    let valid: boolean
    await act(async () => {
      valid = await addIssues((value) => [
        value.username === 'test-1' && { message: 'duplicate' },
      ])[1]
    })
    expect(valid!).toBe(false)
  })

  test(`added issues can be removed`, () => {
    const { result } = renderUseIssues({ email: null, password: null })

    const addIssues = result.current[1]

    act(() => {
      const [remove] = addIssues(() => ({
        email: ['missing'],
        password: ['wrong'],
      }))
      remove()
    })

    const [issues] = result.current
    expect(issues.length).toBe(0)
  })

  test(`issues are automatically resolved by default when the data updates`, () => {
    const { result, rerender } = renderUseIssues({ username: '' })
    const addIssues = result.current[1]

    act(() => {
      addIssues((value) => [
        value.username === '' && { message: 'missing', path: 'username' },
      ])

      rerender({ username: 'james' })
    })

    const [issues] = result.current
    expect(issues.length).toBe(0)
  })

  test(`setting the "attemptResolutionOnChange" option to false disabled automatic resolution`, () => {
    const options = {
      attemptResolutionOnChange: false,
    }
    const { result, rerender } = renderUseIssues({ username: '' }, options)
    const addIssues = result.current[1]

    act(() => {
      addIssues((value) => [
        value.username === '' && { message: 'missing', path: 'username' },
      ])
    })

    act(() => {
      rerender({ username: 'james' }, options)
    })

    const [issues] = result.current
    expect(issues.length).toBe(1)
  })

  test(`issue arrays can be added directly`, () => {
    const { result } = renderUseIssues({ username: null })
    const addIssues = result.current[1]

    act(() => {
      addIssues([{ message: 'missing', path: 'username' }])
    })

    const [issues] = result.current

    expect(issues.length).toBe(1)
    expect(issues[0]).toMatchObject({
      path: 'username',
      code: 'missing',
    })
  })

  test(`issues can be cleared by calling "clearIssues(key)"`, () => {
    const { result } = renderUseIssues({ username: null })
    const [, addIssues, clearIssues] = result.current

    const issuesToAdd = [{ code: 'missing', path: 'username' }] as const

    act(() => {
      addIssues(issuesToAdd)
      clearIssues(issuesToAdd)
    })

    const [issues] = result.current

    expect(issues.length).toBe(0)
  })
})
