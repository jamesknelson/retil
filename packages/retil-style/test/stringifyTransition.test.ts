import { stringifyTransition } from '../src'

describe('stringifyTransition()', () => {
  test('sets defaults on passed-in transitions', () => {
    const str = stringifyTransition(
      { property: 'transform' },
      {
        defaults: {
          duration: '500ms',
          timing: 'linear',
        },
      },
    )

    expect(str).toEqual('transform 500ms linear')
  })

  test('uses ms as the default unit for numeric duration and delay', () => {
    const str = stringifyTransition({
      property: 'transform',
      duration: 500,
      delay: 500,
      timing: 'linear',
    })

    expect(str).toEqual('transform 500ms linear 500ms')
  })

  test('maps property groups', () => {
    const str = stringifyTransition(
      { property: 'size', duration: '500ms', timing: 'linear' },
      {
        properties: {
          size: ['margin-bottom', 'border-width'],
        },
      },
    )

    expect(str).toEqual('margin-bottom 500ms linear, border-width 500ms linear')
  })

  test('uses all specified properties as the default', () => {
    const str = stringifyTransition(
      { duration: '500ms', timing: 'linear' },
      {
        properties: {
          color: true,
          size: 'margin-bottom',
        },
      },
    )

    expect(str).toEqual('color 500ms linear, margin-bottom 500ms linear')
  })
})
