import { delay, identity } from '@retil/common'
import { createAsyncGeneratorSource } from '../src'

const createTestSource = <T = number>(
  getValue: (i: number) => T = identity as any,
) =>
  createAsyncGeneratorSource<T>(async function* () {
    await delay(1)
    yield getValue(0)
    await delay(1)
    return getValue(1)
  })

describe('async generator sources', () => {
  test('suspend until the first value is yielded', async () => {
    const [source] = createTestSource()

    expect(source.hasCurrentValue()).toBe(false)

    let readyPromise
    try {
      source.getCurrentValue()
    } catch (promise) {
      readyPromise = promise
      expect(promise).toBeInstanceOf(Promise)
    }

    await readyPromise

    expect(source.getCurrentValue()).toBe(0)
    expect(await source.getValue()).toBe(0)
  })

  test('can force return', async () => {
    const [source, finalize] = createTestSource()

    finalize(100)

    expect(await source.getValue()).toBe(100)
  })

  test('notify subscribers of new values', async () => {
    const [source] = createTestSource()

    expect(await source.getValue()).toBe(0)

    await new Promise(source.subscribe)

    expect(await source.getValue()).toBe(1)
  })

  test('do not notify subscribers when the same value is yielded repeatedly', async () => {
    let computedValueCount = 0

    const [source] = createTestSource(() => {
      ++computedValueCount
      return 'same'
    })

    let initialNotificationCount = 0
    source.subscribe(() => ++initialNotificationCount)

    expect(await source.getValue()).toBe('same')

    let subsequentNotificationCount = 0
    source.subscribe(() => ++subsequentNotificationCount)

    await delay(10)

    expect(computedValueCount).toBe(2)
    expect(initialNotificationCount).toBe(1)
    expect(subsequentNotificationCount).toBe(0)
  })
})
