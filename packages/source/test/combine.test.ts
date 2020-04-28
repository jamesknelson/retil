import { combine, createDescriptorSource } from '../src'
import { createTestSource } from './utils/createTestSource'

describe('combine()', () => {
  test('gets and subscribes to all children concurrently, even if some of them suspend', async () => {
    const [a] = createTestSource()
    const [b] = createTestSource()

    // Both of these sources should start as suspended
    expect(a.hasCurrentValue()).toBe(false)
    expect(b.hasCurrentValue()).toBe(false)

    // Wrap our underlying sources w/ stubs for subscribe/getCurrentValue so
    // that we can watch what's happening
    const subscribeToA = jest.fn(a.subscribe)
    const subscribeToB = jest.fn(b.subscribe)
    const getCurrentValueForA = jest.fn(a.getCurrentValue)
    const getCurrentValueForB = jest.fn(b.getCurrentValue)
    const aWrapper = createDescriptorSource({
      subscribe: subscribeToA,
      getCurrentValue: getCurrentValueForA,
    })
    const bWrapper = createDescriptorSource({
      subscribe: subscribeToB,
      getCurrentValue: getCurrentValueForB,
    })

    const combined = combine({
      a: aWrapper,
      b: bWrapper,
    })
    const combinedValuePromise = combined.getValue()

    expect(combined.hasCurrentValue()).toBe(false)

    // Despite the fact that the first source that `combine` sees is already
    // suspended, it should still immediately subscribe to the others.
    expect(subscribeToA).toHaveBeenCalled()
    expect(subscribeToB).toHaveBeenCalled()
    expect(getCurrentValueForA).toHaveBeenCalled()
    expect(getCurrentValueForB).toHaveBeenCalled()

    await expect(combinedValuePromise).resolves.toEqual({
      a: 0,
      b: 0,
    })

    expect(combined.hasCurrentValue()).toBe(true)
  })
})
