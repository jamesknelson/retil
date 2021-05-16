import { resolveAction, createHref, parseAction } from '../src'

describe(`nav utils`, () => {
  test(`createHref(parseAction()) is a noop`, () => {
    const location = '/test?param=1&another=two#id'
    expect(createHref(parseAction(location))).toBe(location)
  })

  test(`parseAction() generates correct searches from queries`, () => {
    expect(parseAction({ query: { param: '1', another: 'two' } }).search).toBe(
      '?param=1&another=two',
    )

    expect(parseAction({ query: {} }).search).toBe('')
  })

  test(`resolveAction() works in pathnames with no leading . or /`, () => {
    const pathname = '/browse/deck/word'

    expect(resolveAction('test', pathname).pathname).toBe('/browse/deck/test')
    expect(resolveAction({ pathname: 'test' }, pathname).pathname).toBe(
      '/browse/deck/test',
    )
  })
})
