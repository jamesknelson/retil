import React from 'react'
import { render } from '@testing-library/react'

import {
  CSSFunction,
  HighStyle,
  ProvideDownSelector,
  useHighStyle,
} from '../src'

const defaultWrapper: React.FunctionComponent = ({ children }) => (
  <>{children}</>
)

function renderHighStyle(
  highStyle: HighStyle,
  {
    wrapper: Wrapper = defaultWrapper,
  }: { wrapper?: React.FunctionComponent } = {},
) {
  const result = {} as React.MutableRefObject<
    (highStyle: HighStyle) => CSSFunction
  >
  const Test = () => {
    result.current = useHighStyle()
    return <></>
  }
  render(
    <React.StrictMode>
      <Wrapper>
        <Test />
      </Wrapper>
    </React.StrictMode>,
  )
  return result.current(highStyle)
}

describe('useHighStyle()', () => {
  test('accepts primitive values', () => {
    const fn = renderHighStyle({
      borderColor: 'black',
      borderWidth: 1,
    })

    expect(fn({})).toEqual({
      borderColor: 'black',
      borderWidth: 1,
    })
  })

  test('accepts theme functions', () => {
    const theme = { borderColor: 'black' }
    const fn = renderHighStyle({
      borderColor: (theme: any) => theme.borderColor,
      borderWidth: 1,
    })

    expect(fn(theme)).toEqual({
      borderColor: 'black',
      borderWidth: 1,
    })
  })

  test('accepts selector objects', () => {
    const options = {
      wrapper: ({ children }: any) => (
        <ProvideDownSelector
          downSelect={(name: string) => {
            switch (name) {
              case 'active':
                return ':active'
              case 'hover':
                return ':hover'
              default:
                return undefined
            }
          }}>
          {children}
        </ProvideDownSelector>
      ),
    }

    const fn = renderHighStyle(
      {
        borderColor: {
          default: (theme: any) => theme.borderColor,
          active: 'red',
          hover: 'gray',
        },
      },
      options,
    )

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
    const options = {
      wrapper: ({ children }: any) => (
        <ProvideDownSelector
          downSelect={(name: string) => {
            switch (name) {
              case 'active':
                return ':active'
              default:
                return undefined
            }
          }}>
          {children}
        </ProvideDownSelector>
      ),
    }

    const fn = renderHighStyle(
      {
        borderColor: (theme: any) => theme.borderColor,
      },
      options,
    )

    expect(
      fn({
        borderColor: {
          default: 'black',
          active: 'red',
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
    const options = {
      wrapper: ({ children }: any) => (
        <ProvideDownSelector
          downSelect={(name: string) => {
            switch (name) {
              case 'mobile':
                return '@media(max-width: 600px)'
              case 'tabletPlus':
                return '@media(min-width: 601px)'
              case 'active':
                return ':active'
              default:
                return undefined
            }
          }}>
          {children}
        </ProvideDownSelector>
      ),
    }

    const fn = renderHighStyle(
      {
        borderColor: (theme: any) => theme.borderColor,
        opacity: {
          default: 1,
          mobile: {
            active: 0.8,
          },
        },
      },
      options,
    )

    expect(
      fn({
        borderColor: {
          default: 'black',
          tabletPlus: {
            active: 'red',
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

  test('ignores unknown selectors', () => {
    const theme = { borderColor: 'black' }
    const fn = renderHighStyle({
      borderColor: {
        active: (theme: any) => theme.borderColor,
      },
      borderWidth: 1,
    })

    expect(fn(theme)).toEqual({
      borderWidth: 1,
    })
  })

  test('ignores "false" selectors', () => {
    const options = {
      wrapper: ({ children }: any) => (
        <ProvideDownSelector downSelect={() => false}>
          {children}
        </ProvideDownSelector>
      ),
    }

    const fn = renderHighStyle(
      {
        borderColor: {
          default: 'black',
          active: 'red',
        },
      },
      options,
    )

    expect(fn({})).toEqual({
      borderColor: 'black',
    })
  })

  test('passes through "true" selectors', () => {
    const options = {
      wrapper: ({ children }: any) => (
        <ProvideDownSelector downSelect={() => true}>
          {children}
        </ProvideDownSelector>
      ),
    }

    const fn = renderHighStyle(
      {
        borderColor: {
          default: 'black',
          active: 'red',
        },
      },
      options,
    )

    expect(fn({})).toEqual({
      borderColor: 'red',
    })
  })
})
