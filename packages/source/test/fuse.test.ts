import { delay, identity } from '@retil/common'
import { createTestSource } from './utils/createTestSource'

describe('map()', () => {
  test('maps missing values to missing values', async () => {
    const [testSource] = createTestSource()

    const filteredMappedSource = testSource
      .filter((i) => i % 2 === 0)
      .map((i) => i * 2)

    expect(filteredMappedSource.hasCurrentValue()).toBe(false)
    await new Promise(filteredMappedSource.subscribe)
    expect(filteredMappedSource.hasCurrentValue()).toBe(true)
    expect(filteredMappedSource.getCurrentValue()).toBe(0)
    await new Promise(filteredMappedSource.subscribe)
    expect(filteredMappedSource.hasCurrentValue()).toBe(false)
    await new Promise(filteredMappedSource.subscribe)
    expect(filteredMappedSource.hasCurrentValue()).toBe(true)
    expect(filteredMappedSource.getCurrentValue()).toBe(4)
  })

  test('ensures new mapped values are available as soon as the underlying source sends a notification', async () => {
    const [testSource] = createTestSource()
    const mappedSource = testSource.map((i) => i * 2)

    expect(mappedSource.hasCurrentValue()).toBe(false)
    await new Promise(testSource.subscribe)
    expect(mappedSource.hasCurrentValue()).toBe(true)
  })

  test("skips subscribe notifications for mapped values which don't change from the previous one", async () => {
    const [testSource] = createTestSource(identity, { maxCount: 2 })
    const mappedSource = testSource.map((i) => 'constant')

    const testSourceListener = jest.fn()
    testSource.subscribe(testSourceListener)

    const mappedSourceListener = jest.fn()
    mappedSource.subscribe(mappedSourceListener)

    expect(mappedSource.hasCurrentValue()).toBe(false)
    await new Promise(testSource.subscribe)
    expect(mappedSource.getCurrentValue()).toBe('constant')
    await new Promise(testSource.subscribe)
    expect(mappedSource.getCurrentValue()).toBe('constant')

    await delay(1)

    expect(testSourceListener).toBeCalledTimes(2)
    expect(mappedSourceListener).toBeCalledTimes(1)
  })
})

describe('filter()', () => {
  test('can map sources with values to sources without values', async () => {
    const [testSource] = createTestSource()

    const filteredMappedSource = testSource.filter((i) => i % 2 === 0)

    expect(filteredMappedSource.hasCurrentValue()).toBe(false)
    await new Promise(filteredMappedSource.subscribe)
    expect(filteredMappedSource.hasCurrentValue()).toBe(true)
    expect(filteredMappedSource.getCurrentValue()).toBe(0)
    await new Promise(filteredMappedSource.subscribe)
    expect(filteredMappedSource.hasCurrentValue()).toBe(false)
    await new Promise(filteredMappedSource.subscribe)
    expect(filteredMappedSource.hasCurrentValue()).toBe(true)
    expect(filteredMappedSource.getCurrentValue()).toBe(2)
  })

  test("doesn't notify listeners when underlying source changes, but output is still without value", async () => {
    const [testSource] = createTestSource()

    // This source only passes through multiples of three
    const filteredMappedSource = testSource.filter((i) => i % 3 === 0)

    expect(filteredMappedSource.hasCurrentValue()).toBe(false)
    await new Promise(filteredMappedSource.subscribe)
    expect(filteredMappedSource.hasCurrentValue()).toBe(true)
    expect(filteredMappedSource.getCurrentValue()).toBe(0)

    // One notification should be sent when the underlying source changes from
    // 0 to 1
    await new Promise(filteredMappedSource.subscribe)
    expect(filteredMappedSource.hasCurrentValue()).toBe(false)

    // And the next should be sent when it changes from 2 to 3 -- the change
    // from 1 to 2 should be skipped.
    await new Promise(filteredMappedSource.subscribe)
    expect(filteredMappedSource.hasCurrentValue()).toBe(true)
    expect(filteredMappedSource.getCurrentValue()).toBe(3)
  })
})

describe('fallback()', () => {
  test('returns a source that replaces missing values in the underlying source with the provided value', async () => {
    const [testSource] = createTestSource()

    const filteredSourceWithFallback = testSource
      .filter((i) => i % 2 === 0)
      .fallback(-1)

    await new Promise(filteredSourceWithFallback.subscribe)
    expect(filteredSourceWithFallback.getCurrentValue()).toBe(0)
    await new Promise(filteredSourceWithFallback.subscribe)
    expect(filteredSourceWithFallback.getCurrentValue()).toBe(-1)
    await new Promise(filteredSourceWithFallback.subscribe)
    expect(filteredSourceWithFallback.getCurrentValue()).toBe(2)
    await new Promise(filteredSourceWithFallback.subscribe)
    expect(filteredSourceWithFallback.getCurrentValue()).toBe(-1)
  })
})

describe('last()', () => {
  test('returns a source that replaces missing values in the underlying source with the last value it had', async () => {
    const [testSource] = createTestSource()

    const filteredSourceLastValue = testSource.filter((i) => i % 3 === 1).last()

    await new Promise(filteredSourceLastValue.subscribe)
    expect(filteredSourceLastValue.getCurrentValue()).toBe(1)
    await new Promise(filteredSourceLastValue.subscribe)
    expect(filteredSourceLastValue.getCurrentValue()).toBe(4)
  })
})

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
