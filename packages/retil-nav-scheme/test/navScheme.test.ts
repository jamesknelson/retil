import { createHref } from 'retil-nav'

import { createScheme, nestScheme, patternFor } from '../src'

describe('nav schemes', () => {
  test(`can be constant stings`, async () => {
    const scheme = createScheme({
      top: () => '/',
    })

    expect(createHref(scheme.top())).toBe('/')
    expect(patternFor(scheme.top)).toBe('/')
  })

  test(`can be constant nav action objects`, async () => {
    const scheme = createScheme({
      top: () => ({
        pathname: '/test',
        query: {
          passed: 'true',
        },
      }),
    })

    expect(createHref(scheme.top())).toBe('/test?passed=true')
    expect(patternFor(scheme.top)).toBe('/test')
  })

  test(`can have params`, async () => {
    const scheme = createScheme({
      test: ({
        handle,
        id,
        passed,
      }: {
        handle: string
        id: string
        passed: boolean
      }) => ({
        query: { passed: String(passed) },
        pathname: `/@${handle}/${id}`,
      }),
    })

    expect(
      createHref(
        scheme.test({
          handle: 'bob',
          id: '1',
          passed: true,
        }),
      ),
    ).toBe('/@bob/1?passed=true')
    expect(patternFor(scheme.test)).toBe('/@:handle/:id')
  })

  test(`can be nested at fixed paths`, async () => {
    const nestedScheme = createScheme({
      scheme: () => ({
        pathname: '/scheme',
      }),
    })

    const scheme = createScheme({
      nested: nestScheme('/nested', nestedScheme),
    })

    expect(createHref(scheme.nested())).toBe('/nested')
    expect(patternFor(scheme.nested)).toBe('/nested*')

    expect(createHref(scheme.nested.scheme())).toBe('/nested/scheme')
    expect(patternFor(scheme.nested.scheme)).toBe('/nested/scheme')
  })

  test(`can be nested at paths with params`, async () => {
    const nestedScheme = createScheme({
      nested: () => ({
        pathname: '/nested',
      }),
    })

    const scheme = createScheme({
      id: nestScheme(
        ({ id, passed }: { id: string; passed: boolean }) => ({
          query: { passed: String(passed) },
          pathname: `/${id}`,
        }),
        nestedScheme,
      ),
    })

    expect(createHref(scheme.id({ id: '1', passed: true }))).toBe(
      '/1?passed=true',
    )
    expect(patternFor(scheme.id)).toBe('/:id*')

    expect(createHref(scheme.id.nested({ id: '1', passed: true }))).toBe(
      '/1/nested?passed=true',
    )
    expect(patternFor(scheme.id.nested)).toBe('/:id/nested')
  })
})
