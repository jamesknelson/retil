import '@testing-library/jest-dom/extend-expect'
import * as React from 'react'
import { act, render } from '@testing-library/react'

import { Issues, UseIssuesOptions, useIssues } from '../src'

describe('useIssues', () => {
  function renderUseIssues<
    Data,
    BasePath extends string | number | symbol = 'base'
  >(data: Data, options?: UseIssuesOptions<Data, BasePath>) {
    const result = {
      current: (undefined as any) as Issues<Data>,
    }
    const results = [] as Issues<Data>[]
    const Wrapper = ({ data, options }: any) => {
      result.current = useIssues(data, options)
      results.push(result.current)
      return <></>
    }
    const root = render(<Wrapper data={data} options={options} />)
    const rerender = (data: Data, options?: UseIssuesOptions<Data>) => {
      root.rerender(<Wrapper data={data} options={options} />)
    }
    return { result, results, rerender }
  }

  test(`returns no issues initially`, () => {
    const { result } = renderUseIssues({ username: null })

    expect(result.current.exist).toBe(false)
    expect(result.current.all.length).toBe(0)
    expect(Object.keys(result.current.on).length).toBe(0)
  })

  test(`can add unresolved issues`, () => {
    const { result } = renderUseIssues({ username: null })

    act(() => {
      result.current.addValidator((data) => [
        data.username === null && { message: 'missing', path: 'username' },
      ])
    })

    expect(result.current.exist).toBe(true)
    expect(result.current.all.length).toBe(1)
    expect(result.current.on.username?.message).toBe('missing')
  })

  test(`can add an object containing arrays of messages`, () => {
    const { result } = renderUseIssues({ email: null, password: null })

    act(() => {
      result.current.addValidator((data) => ({
        email: ['missing'],
        password: ['wrong'],
      }))
    })

    expect(result.current.exist).toBe(true)
    expect(result.current.all.length).toBe(2)
    expect(result.current.on.email?.message).toBe('missing')
    expect(result.current.on.password?.message).toBe('wrong')
  })

  test(`adding resolved issues silently disappears them`, () => {
    const { result } = renderUseIssues({ username: 'test-1' })

    act(() => {
      result.current.addValidator((data) => [
        data.username === 'test-2' && { message: 'duplicate' },
      ])
    })

    expect(result.current.exist).toBe(false)
  })

  test(`adding issues that have already been resolved returns a promise to "true"`, async () => {
    const { result } = renderUseIssues({ username: 'test-1' })
    let valid: boolean
    await act(async () => {
      valid = await result.current.addValidator((data) => [
        data.username === 'test-2' && { message: 'duplicate' },
      ])
    })
    expect(valid!).toBe(true)
  })

  test(`adding unresolved issues returns a promise to "false"`, async () => {
    const { result } = renderUseIssues({ username: 'test-1' })
    let valid: boolean
    await act(async () => {
      valid = await result.current.addValidator((data) => [
        data.username === 'test-1' && { message: 'duplicate' },
      ])
    })
    expect(valid!).toBe(false)
  })

  test.todo(
    `issues are automatically resolved by default when the data updates`,
  )

  test.todo(
    `setting the "attemptResolutionOnChange" option to false disabled automatic resolution`,
  )

  test.todo(`issues can be manually resolved by calling "issues.resolve(data)"`)

  test.todo(`issues can be cleared by calling "issues.clear(validator)"`)

  test.todo(
    `if the data argument doesn't change from its previous value, it won't reset the data set by "issues.resolve(data)"`,
  )
})
