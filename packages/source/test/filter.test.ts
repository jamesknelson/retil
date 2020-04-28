import { createTestSource } from './utils/createTestSource'

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
