import {
  applyLocationAction,
  createHref,
  parseAction,
  parseLocation,
} from '../src'

describe(`history utils`, () => {
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

  test(`applyLocationAction() works in pathnames with no leadong . or /`, () => {
    const location = parseLocation({ pathname: '/browse/deck/word' })

    expect(applyLocationAction(location, 'test').pathname).toBe(
      '/browse/deck/test',
    )
    expect(applyLocationAction(location, { pathname: 'test' }).pathname).toBe(
      '/browse/deck/test',
    )
  })
})
