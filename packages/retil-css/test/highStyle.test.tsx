import {
  getOrRegisterSelectorType,
  resetRegisteredSelectorTypes,
  highStyle,
  mapHighStyleValue,
} from '../src'

describe('useHighStyle()', () => {
  beforeEach(resetRegisteredSelectorTypes)

  test('accepts primitive values', () => {
    const fn = highStyle({
      borderColor: 'black',
      borderWidth: 1,
    })

    expect(fn({})).toEqual({
      borderColor: 'black',
      borderWidth: 1,
    })
  })

  test('accepts mapped values', () => {
    const fn = highStyle({
      boxShadow: mapHighStyleValue('black', (value) => '0 0 3px ' + value),
    })

    expect(fn({})).toEqual({
      boxShadow: '0 0 3px black',
    })
  })

  test('accepts theme functions', () => {
    const theme = { borderColor: 'black' }
    const fn = highStyle({
      borderColor: (theme: any) => theme.borderColor,
      borderWidth: 1,
    })

    expect(fn(theme)).toEqual({
      borderColor: 'black',
      borderWidth: 1,
    })
  })

  test('accepts mapped theme values', () => {
    const theme = { shadowColor: 'black' }
    const fn = highStyle({
      boxShadow: mapHighStyleValue(
        (theme: any) => theme.shadowColor,
        (value) => '0 0 3px ' + value,
      ),
    })

    expect(fn(theme)).toEqual({
      boxShadow: '0 0 3px black',
    })
  })

  test('accepts high selectors', () => {
    const { createSelector } = getOrRegisterSelectorType(
      (_selectorId, selectorString: string) => selectorString,
    )
    const inActive = createSelector(':active')
    const inHover = createSelector(':hover')

    const fn = highStyle({
      borderColor: {
        default: (theme: any) => theme.borderColor,
        [inActive]: 'red',
        [inHover]: 'gray',
      },
    })

    expect(fn({ borderColor: 'black' })).toEqual({
      borderColor: 'black',
      ':active': {
        borderColor: 'red',
      },
      ':hover': {
        borderColor: 'gray',
      },
    })
  })

  test('accepts selector objects returned from theme functions', () => {
    const { createSelector } = getOrRegisterSelectorType(
      (_selectorId, selectorString: string) => selectorString,
    )
    const inActive = createSelector(':active')
    createSelector(':hover')

    const fn = highStyle({
      borderColor: (theme: any) => theme.borderColor,
    })

    expect(
      fn({
        borderColor: {
          default: 'black',
          [inActive]: 'red',
        },
      }),
    ).toEqual({
      borderColor: 'black',
      ':active': {
        borderColor: 'red',
      },
    })
  })

  test('accepts nested selector objects', () => {
    const { createSelector } = getOrRegisterSelectorType(
      (_selectorId, selectorString: string) => selectorString,
    )
    const inMobile = createSelector('@media(max-width: 600px)')
    const inTabletPlus = createSelector('@media(min-width: 601px)')
    const inActive = createSelector(':active')

    const fn = highStyle({
      borderColor: (theme: any) => theme.borderColor,
      opacity: {
        default: 1,
        [inMobile]: {
          [inActive]: 0.8,
        },
      },
    })

    expect(
      fn({
        borderColor: {
          default: 'black',
          [inTabletPlus]: {
            [inActive]: 'red',
          },
        },
      }),
    ).toEqual({
      borderColor: 'black',
      '@media(min-width: 601px)': {
        ':active': {
          borderColor: 'red',
        },
      },
      opacity: 1,
      '@media(max-width: 600px)': {
        ':active': {
          opacity: 0.8,
        },
      },
    })
  })

  test('passes through unknown selectors', () => {
    const theme = { borderColor: 'black' }
    const fn = highStyle({
      borderColor: {
        ':active': (theme: any) => theme.borderColor,
      },
      borderWidth: 1,
    })

    expect(fn(theme)).toEqual({
      ':active': {
        borderColor: 'black',
      },
      borderWidth: 1,
    })
  })

  test('ignores "false" selectors', () => {
    const { createSelector } = getOrRegisterSelectorType(
      (_selectorId, selectorString: string | boolean) => selectorString,
    )
    const inNothing = createSelector(false)

    const fn = highStyle({
      borderColor: {
        default: 'black',
        [inNothing]: 'red',
      },
    })

    expect(fn({})).toEqual({
      borderColor: 'black',
    })
  })

  test('passes through "true" selectors', () => {
    const { createSelector } = getOrRegisterSelectorType(
      (_selectorId, selectorString: string | boolean) => selectorString,
    )
    const inSomething = createSelector(true)

    const fn = highStyle({
      borderColor: {
        default: 'black',
        [inSomething]: 'red',
      },
    })

    expect(fn({})).toEqual({
      borderColor: 'red',
    })
  })
})
